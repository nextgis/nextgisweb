# -*- coding: utf-8 -*-
from __future__ import division, absolute_import, print_function, unicode_literals
import json
from collections import OrderedDict
import zope.event

from pyramid.httpexceptions import HTTPBadRequest
from pyramid.response import Response
from sqlalchemy.sql.operators import ilike_op
from sqlalchemy.sql.expression import collate

from .. import db
from .. import geojson
from ..core.exception import InsufficientPermissions
from ..models import DBSession
from ..auth import User

from .model import Resource, ResourceSerializer
from .scope import ResourceScope
from .exception import ResourceError, ValidationError
from .serialize import CompositeSerializer
from .view import resource_factory
from .util import _
from .events import AfterResourcePut, AfterResourceCollectionPost
from .presolver import PermissionResolver, ExplainACLRule, ExplainRequirement, ExplainDefault


PERM_READ = ResourceScope.read
PERM_DELETE = ResourceScope.delete
PERM_MCHILDREN = ResourceScope.manage_children
PERM_CPERM = ResourceScope.change_permissions


def item_get(context, request):
    request.resource_permission(PERM_READ)

    serializer = CompositeSerializer(context, request.user)
    serializer.serialize()

    return Response(
        geojson.dumps(serializer.data), status_code=200,
        content_type='application/json', charset='utf-8')


def item_put(context, request):
    request.resource_permission(PERM_READ)

    serializer = CompositeSerializer(context, request.user, request.json_body)
    with DBSession.no_autoflush:
        result = serializer.deserialize()

    zope.event.notify(AfterResourcePut(context, request))

    return Response(
        json.dumps(result), status_code=200,
        content_type='application/json', charset='utf-8')


def item_delete(context, request):

    def delete(obj):
        request.resource_permission(PERM_DELETE, obj)
        request.resource_permission(PERM_MCHILDREN, obj)

        for chld in obj.children:
            delete(chld)

        DBSession.delete(obj)

    if context.id == 0:
        raise ResourceError(_("Root resource could not be deleted."))

    with DBSession.no_autoflush:
        delete(context)

    DBSession.flush()

    return Response(
        json.dumps(None), status_code=200,
        content_type='application/json', charset='utf-8')


def collection_get(request):
    parent = request.params.get('parent')
    parent = int(parent) if parent else None

    query = Resource.query() \
        .filter_by(parent_id=parent) \
        .order_by(Resource.display_name) \
        .options(db.subqueryload(Resource.acl))

    result = list()
    for resource in query:
        if resource.has_permission(PERM_READ, request.user):
            serializer = CompositeSerializer(resource, request.user)
            serializer.serialize()
            result.append(serializer.data)

    return Response(
        json.dumps(result, cls=geojson.Encoder), status_code=200,
        content_type='application/json', charset='utf-8')


def collection_post(request):
    data = dict(request.json_body)

    if 'resource' not in data:
        data['resource'] = dict()

    qparent = request.params.get('parent')
    if qparent is not None:
        data['resource']['parent'] = dict(id=int(qparent))

    cls = request.params.get('cls')
    if cls is not None:
        data['resource']['cls'] = cls

    if 'parent' not in data['resource']:
        raise ValidationError(_("Resource parent required."))

    if 'cls' not in data['resource']:
        raise ValidationError(_("Resource class required."))

    if data['resource']['cls'] not in Resource.registry:
        raise ValidationError(_("Unknown resource class '%s'.") % data['resource']['cls'])

    elif (
        data['resource']['cls'] in request.env.resource.options['disabled_cls']
        or request.env.resource.options['disable.' + data['resource']['cls']]
    ):
        raise ValidationError(_("Resource class '%s' disabled.") % data['resource']['cls'])

    cls = Resource.registry[data['resource']['cls']]
    resource = cls(owner_user=request.user)

    serializer = CompositeSerializer(resource, request.user, data)
    serializer.members['resource'].mark('cls')

    with DBSession.no_autoflush:
        serializer.deserialize()

    resource.persist()
    DBSession.flush()

    result = OrderedDict(id=resource.id)
    request.audit_context('resource', resource.id)

    # TODO: Parent is returned only for compatibility
    result['parent'] = dict(id=resource.parent.id)

    zope.event.notify(AfterResourceCollectionPost(resource, request))

    return Response(
        json.dumps(result), status_code=201,
        content_type='application/json', charset='utf-8')


def permission(resource, request):
    request.resource_permission(PERM_READ)

    # In some cases it is convenient to pass empty string instead of
    # user's identifier, that's why it so tangled.

    user = request.params.get('user', '')
    user = None if user == '' else user

    if user is not None:
        # To see permissions for arbitrary user additional permissions are needed
        request.resource_permission(PERM_CPERM)
        user = User.filter_by(id=user).one()

    else:
        # If it is not set otherwise, use current user
        user = request.user

    effective = resource.permissions(user)

    result = OrderedDict()
    for k, scope in resource.scope.items():
        sres = OrderedDict()

        for perm in scope.values(ordered=True):
            sres[perm.name] = perm in effective

        result[k] = sres

    return Response(
        json.dumps(result), status_code=200,
        content_type='application/json', charset='utf-8')


def permission_explain(request):
    request.resource_permission(PERM_READ)

    req_scope = request.params.get('scope')
    req_permission = request.params.get('permission')

    req_user_id = request.params.get('user')
    user = User.filter_by(id=req_user_id).one() if req_user_id is not None else request.user
    other_user = user != request.user
    if other_user:
        request.resource_permission(PERM_CPERM)

    resource = request.context

    if req_scope is not None or req_permission is not None:
        permissions = list()
        for perm in resource.class_permissions():
            if req_scope is None or perm.scope.identity == req_scope:
                if req_permission is None or perm.name == req_permission:
                    permissions.append(perm)
        if len(permissions) == 0:
            raise ValidationError(_("Permission not found"))
    else:
        permissions = None

    resolver = PermissionResolver(request.context, user, permissions, explain=True)

    def _jsonify_principal(principal):
        result = OrderedDict(id=principal.id)
        result['cls'] = {'U': 'user', 'G': 'group'}[principal.cls]
        if principal.system:
            result['keyname'] = principal.keyname
        return result

    def _explain_jsonify(value):
        if value is None:
            return None

        result = OrderedDict()
        for scope_identity, scope in value.resource.scope.items():
            n_scope = result.get(scope_identity)
            for perm in scope.values(ordered=True):
                if perm in value._result:
                    if n_scope is None:
                        n_scope = result[scope_identity] = OrderedDict()
                    n_perm = n_scope[perm.name] = OrderedDict()
                    n_perm['result'] = value._result[perm]
                    n_explain = n_perm['explain'] = list()
                    for item in value._explanation[perm]:
                        i_res = item.resource

                        n_item = OrderedDict((
                            ('result', item.result),
                            ('resource', dict(id=i_res.id) if i_res else None),
                        ))

                        n_explain.append(n_item)
                        if isinstance(item, ExplainACLRule):
                            n_item['type'] = 'acl_rule'
                            if i_res.has_permission(PERM_READ, request.user):
                                n_item['acl_rule'] = OrderedDict((
                                    ('action', item.acl_rule.action),
                                    ('principal', _jsonify_principal(item.acl_rule.principal)),
                                    ('scope', item.acl_rule.scope),
                                    ('permission', item.acl_rule.permission),
                                    ('identity', item.acl_rule.identity),
                                    ('propagate', item.acl_rule.propagate),
                                ))

                        elif isinstance(item, ExplainRequirement):
                            n_item['type'] = 'requirement'
                            if i_res is None or i_res.has_permission(PERM_READ, request.user):
                                n_item['requirement'] = OrderedDict((
                                    ('scope', item.requirement.src.scope.identity),
                                    ('permission', item.requirement.src.name),
                                    ('attr', item.requirement.attr),
                                    ('attr_empty', item.requirement.attr_empty),
                                ))
                                n_item['satisfied'] = item.satisfied
                                n_item['explain'] = _explain_jsonify(item.resolver)

                        elif isinstance(item, ExplainDefault):
                            n_item['type'] = 'default'

                        else:
                            raise ValueError("Unknown explain item: {}".format(item))
        return result

    return _explain_jsonify(resolver)


def quota(request):
    quota_limit = request.env.resource.quota_limit
    quota_resource_cls = request.env.resource.quota_resource_cls

    count = None
    if quota_limit is not None:
        query = DBSession.query(db.func.count(Resource.id))
        if quota_resource_cls is not None:
            query = query.filter(Resource.cls.in_(quota_resource_cls))

        with DBSession.no_autoflush:
            count = query.scalar()

    result = dict(limit=quota_limit, resource_cls=quota_resource_cls,
                  count=count)

    return Response(
        json.dumps(result), status_code=200,
        content_type='application/json', charset='utf-8')


def search(request):
    smap = dict(resource=ResourceSerializer, full=CompositeSerializer)

    smode = request.GET.pop('serialization', None)
    smode = smode if smode in smap else 'resource'
    principal_id = request.GET.pop('owner_user__id', None)

    scls = smap.get(smode)

    def serialize(resource, user):
        serializer = scls(resource, user)
        serializer.serialize()
        data = serializer.data
        return {Resource.identity: data} if smode == 'resource' else data

    filter_ = []
    for k, v in request.GET.items():
        split = k.rsplit('__', 1)
        if len(split) == 2:
            k, op = split
        else:
            op = 'eq'

        if not hasattr(Resource, k):
            continue
        attr = getattr(Resource, k)
        if op == 'eq':
            filter_.append(attr == v)
        elif op == 'ilike':
            expr = collate(attr, 'C.UTF-8')
            filter_.append(ilike_op(expr, v))
        else:
            raise ValidationError("Operator '%s' is not supported" % op)

    # TODO: Chech speed of with_polymorphic('*')
    query = Resource.query().with_polymorphic('*') \
        .filter(db.and_(*filter_)) \
        .order_by(Resource.display_name)

    if principal_id is not None:
        owner = User.filter_by(principal_id=int(principal_id)).one()
        query = query.filter_by(owner_user=owner)

    result = list()
    for resource in query:
        if resource.has_permission(PERM_READ, request.user):
            result.append(serialize(resource, request.user))

    return Response(
        json.dumps(result, cls=geojson.Encoder), status_code=200,
        content_type='application/json', charset='utf-8')


def resource_volume(resource, request):

    ids = []

    def _collect_ids(res):
        request.resource_permission(ResourceScope.read, res)
        ids.append(res.id)
        for child in res.children:
            _collect_ids(child)

    try:
        _collect_ids(resource)
    except InsufficientPermissions:
        volume = 0
    else:
        res = request.env.core.query_storage(dict(
            resource_id=lambda col: col.in_(ids)))
        volume = res.get('', dict()).get('data_volume', 0)
        volume = volume if volume is not None else 0

    return dict(volume=volume)


def resource_export_get(request):
    request.require_administrator()
    try:
        value = request.env.core.settings_get('resource', 'resource_export')
    except KeyError:
        value = 'data_read'
    return dict(resource_export=value)


def resource_export_put(request):
    request.require_administrator()

    body = request.json_body
    for k, v in body.items():
        if k == 'resource_export':
            if v in ('data_read', 'data_write', 'administrators'):
                request.env.core.settings_set('resource', 'resource_export', v)
            else:
                raise HTTPBadRequest("Invalid value '%s'" % v)
        else:
            raise HTTPBadRequest("Invalid key '%s'" % k)


def setup_pyramid(comp, config):

    config.add_route(
        'resource.item', r'/api/resource/{id:\d+}',
        factory=resource_factory) \
        .add_view(item_get, request_method='GET') \
        .add_view(item_put, request_method='PUT') \
        .add_view(item_delete, request_method='DELETE')

    config.add_route(
        'resource.collection', '/api/resource/') \
        .add_view(collection_get, request_method='GET') \
        .add_view(collection_post, request_method='POST')

    config.add_route(
        'resource.permission', '/api/resource/{id}/permission',
        factory=resource_factory) \
        .add_view(permission, request_method='GET')

    config.add_route(
        'resource.permission.explain', '/api/resource/{id}/permission/explain',
        factory=resource_factory) \
        .add_view(permission_explain, request_method='GET', renderer='json')

    config.add_route(
        'resource.volume', '/api/resource/{id}/volume',
        factory=resource_factory) \
        .add_view(resource_volume, request_method='GET', renderer='json')

    config.add_route(
        'resource.quota', '/api/resource/quota') \
        .add_view(quota, request_method='GET')

    config.add_route(
        'resource.search', '/api/resource/search/') \
        .add_view(search, request_method='GET')

    config.add_route('resource.resource_export',
                     '/api/component/resource/resource_export') \
        .add_view(resource_export_get, request_method='GET', renderer='json') \
        .add_view(resource_export_put, request_method='PUT', renderer='json')

    config.add_route(
        'resource.export', '/api/resource/{id}/export',
        factory=resource_factory)

    config.add_route(
        'resource.file_download', r'/api/resource/{id:\d+}/file/{name:.*}',
        factory=resource_factory)
