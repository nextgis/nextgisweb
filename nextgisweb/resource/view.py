# -*- coding: utf-8 -*-
from __future__ import unicode_literals
import json
from collections import OrderedDict

from pyramid.response import Response
from pyramid import httpexceptions

from ..models import DBSession

from ..views import permalinker
from ..dynmenu import DynMenu, Label, Link, DynItem
from ..psection import PageSections
from ..pyramidcomp import viewargs

from .model import (
    Resource,
    ResourceACLRule,
    ResourceSerializer)
from .exception import ValidationError, Forbidden
from .scope import clscopes, scopeid
from .permission import scope_permissions
from .serialize import CompositeSerializer
from .widget import CompositeWidget


def resource_factory(request):
    if request.matchdict['id'] == '-':
        return None

    # Вначале загружаем ресурс базового класса
    base = Resource.filter_by(id=request.matchdict['id']).one()

    # После чего загружаем ресурс того класса,
    # к которому этот ресурс и относится
    obj = Resource.query().with_polymorphic(
        Resource.registry[base.cls]).filter_by(
        id=request.matchdict['id']).one()

    return obj


@viewargs(renderer='psection.mako')
def show(request):
    request.resource_permission(request.context, Resource, 'identify')
    return dict(obj=request.context, sections=request.context.__psection__)


@viewargs(renderer='nextgisweb:resource/template/json.mako')
def objjson(request):
    request.resource_permission(request.context, Resource, 'identify')
    serializer = CompositeSerializer(obj=request.context, user=request.user)
    serializer.serialize()
    return dict(obj=request.context,
                subtitle="Представление JSON",
                objjson=serializer.data)


@viewargs(renderer='json', json=True)
def schema(request):
    resources = dict()
    scopes = dict()

    cscopes = set()

    for cls in Resource.registry:
        clss = set(clscopes(cls))
        cscopes.update(clss)
        resources[cls.identity] = dict(
            identity=cls.identity,
            label=cls.cls_display_name,
            scopes=map(scopeid, clss))

    for scp in cscopes:
        spermissions = dict()
        for _, p in scope_permissions(scp).iteritems():
            spermissions[p.permission] = dict(
                label=p.label, description=p.description)

        scopes[scopeid(scp)] = dict(
            identity=scopeid(scp),
            label=scp.cls_display_name,
            permissions=spermissions)

    return dict(
        resources=resources,
        scopes=scopes)


@viewargs(renderer='nextgisweb:resource/template/acl.mako')
def security(request):
    request.resource_permission(request.context, Resource, 'permissions')
    return dict(
        obj=request.context,
        subtitle="Управление доступом")


@viewargs(renderer='json', method='GET', json=True)
def security_get(request):
    request.resource_permission(request.context, Resource, 'permissions')
    return [dict([
        (k, getattr(i, k))
        for k in (
            'principal_id', 'identity', 'scope',
            'permission', 'propagate', 'action')
    ]) for i in request.context.acl]


@viewargs(renderer='json', method='PUT', json=True)
def security_put(request):
    request.resource_permission(request.context, Resource, 'permissions')

    for r in list(request.context.acl):
        request.context.acl.remove(r)

    for itm in request.json_body:
        request.context.acl.append(ResourceACLRule(
            principal_id=itm['principal_id'],
            identity=itm['identity'],
            scope=itm['scope'],
            permission=itm['permission'],
            propagate=itm['propagate'],
            action=itm['action']))

    return True


@viewargs(renderer='nextgisweb:resource/template/tree.mako')
def tree(request):
    obj = request.context
    return dict(obj=obj, custom_layout=True)


@viewargs(renderer='json', json=True)
def store(request):
    oid = request.matchdict['id']
    if oid == '':
        oid = None

    query = Resource.query().with_polymorphic('*')
    if oid is not None:
        query = query.filter_by(id=oid)

    for k in ('id', 'parent_id'):
        if request.GET.get(k):
            query = query.filter(getattr(Resource, k) == request.GET.get(k))

    result = []

    for res in query:
        if not res.has_permission(Resource, 'identify', request.user):
            continue

        serializer = ResourceSerializer(res, request.user)
        serializer.serialize()
        itm = serializer.data

        if oid is not None:
            return itm
        else:
            result.append(itm)

    return result


def exception_to_response(exception):
    if isinstance(exception, ValidationError):
        return Response(
            json.dumps(dict(message=exception.message)), status_code=400,
            content_type=b'application/json')

    elif isinstance(exception, Forbidden):
        return Response(
            json.dumps(dict(message=exception.message)), status_code=403,
            content_type=b'application/json')

    raise exception


@viewargs(renderer='json')
def child_get(request):
    # TODO: Security

    child_id = request.matchdict['child_id']
    child_id = None if child_id == '' else child_id

    query = Resource.query().with_polymorphic('*').filter_by(
        parent_id=request.context.id if request.context else None)

    if child_id is not None:
        query = query.filter_by(id=child_id)

    result = []

    for child in query:
        serializer = CompositeSerializer(child, request.user)
        serializer.serialize()

        if child_id is not None:
            return serializer.data
        else:
            result.append(serializer.data)

    return result


def child_patch(request):
    child_id = request.matchdict['child_id']
    assert child_id != ''

    data = request.json_body

    child = Resource.query().with_polymorphic('*') \
        .filter_by(id=child_id).one()

    serializer = CompositeSerializer(child, request.user, data)

    try:
        result = serializer.deserialize()
        DBSession.flush()
        return Response(
            json.dumps(result), status_code=200,
            content_type=b'application/json')

    except Exception as e:
        return exception_to_response(e)


def child_post(request):
    child_id = request.matchdict['child_id']
    assert child_id == ''

    data = request.json_body

    cls = Resource.registry[data['resource']['cls']]
    child = cls(owner_user=request.user)

    try:
        deserializer = CompositeSerializer(child, request.user, data)
        deserializer.members['resource'].mark('cls')
        deserializer.deserialize()

        child.persist()
        DBSession.flush()

        location = request.route_url(
            'resource.child',
            id=child.parent_id,
            child_id=child.id)

        data = OrderedDict(id=child.id)
        data['parent'] = dict(id=child.parent_id)

        return Response(
            json.dumps(data), status_code=201,
            content_type=b'application/json', headerlist=[
                (b"Location", bytes(location)), ])

    except Exception as e:
        return exception_to_response(e)


@viewargs(renderer='nextgisweb:resource/template/composite_widget.mako')
def create(request):
    return dict(obj=request.context, subtitle="Создать ресурс", maxheight=True,
                query=dict(operation='create', cls=request.GET.get('cls'),
                           parent=request.context.id))


@viewargs(renderer='nextgisweb:resource/template/composite_widget.mako')
def update(request):
    return dict(obj=request.context, maxheight=True,
                query=dict(operation='update', id=request.context.id))


@viewargs(renderer='nextgisweb:resource/template/composite_widget.mako')
def delete(request):
    return dict(obj=request.context, subtitle="Удалить ресурс", maxheight=True,
                query=dict(operation='delete', id=request.context.id))


@viewargs(renderer='json')
def widget(request):
    operation = request.GET.get('operation', None)
    resid = request.GET.get('id', None)
    clsid = request.GET.get('cls', None)
    parent_id = request.GET.get('parent', None)

    def url(parent_id, child_id=''):
        return request.route_url(
            'resource.child',
            id=parent_id,
            child_id=child_id)

    if operation == 'create':
        if resid is not None or clsid is None or parent_id is None:
            raise httpexceptions.HTTPBadRequest()

        if clsid not in Resource.registry._dict:
            raise httpexceptions.HTTPBadRequest()

        parent = Resource.query().with_polymorphic('*') \
            .filter_by(id=parent_id).one()

        obj = Resource.registry[clsid](parent=parent, owner_user=request.user)

    elif operation in ('update', 'delete'):
        if resid is None or clsid is not None or parent_id is not None:
            raise httpexceptions.HTTPBadRequest()

        obj = Resource.query().with_polymorphic('*') \
            .filter_by(id=resid).one()

        clsid = obj.cls
        parent = obj.parent

    else:
        raise httpexceptions.HTTPBadRequest()

    widget = CompositeWidget(operation=operation, obj=obj, request=request)
    return dict(
        operation=operation, config=widget.config(), id=resid,
        cls=clsid, parent=parent.id if parent else None)


def setup_pyramid(comp, config):

    def resource_permission(request, resource, cls, permission):
        if not resource.has_permission(cls, permission, request.user):
            raise httpexceptions.HTTPForbidden()

    config.add_request_method(resource_permission, 'resource_permission')

    def _route(route_name, route_path, **kwargs):
        return config.add_route(
            'resource.' + route_name,
            '/resource/' + route_path,
            **kwargs)

    def _resource_route(route_name, route_path, **kwargs):
        return _route(
            route_name, route_path,
            factory=resource_factory,
            **kwargs)

    _route('schema', 'schema', client=()).add_view(schema)

    _route('root', '').add_view(
        lambda (r): httpexceptions.HTTPFound(
            r.route_url('resource.show', id=0)))

    _resource_route('show', '{id:\d+}', client=('id', )).add_view(show)

    _resource_route('json', '{id:\d+}/json', client=('id', )) \
        .add_view(objjson)

    _resource_route('tree', '{id:\d+}/tree', client=('id', )).add_view(tree)

    _route('store', 'store/{id:\d*}', client=('id', )).add_view(store)

    _resource_route('child', '{id:\d+|-}/child/{child_id:\d*}', client=('id', 'child_id')) \
        .add_view(child_get, method='GET') \
        .add_view(child_patch, method='PATCH') \
        .add_view(child_post, method='POST')

    _route('widget', 'widget', client=()).add_view(widget)

    # CRUD
    _resource_route('create', '{id:\d+}/create').add_view(create)
    _resource_route('update', '{id:\d+}/update').add_view(update)
    _resource_route('delete', '{id:\d+}/delete').add_view(delete)

    permalinker(Resource, 'resource.show')

    # ACL

    _resource_route('security', '{id:\d+}/security', client=('id', )) \
        .add_view(security_get).add_view(security_put).add_view(security)

    # Секции

    Resource.__psection__ = PageSections()

    Resource.__psection__.register(
        key='summary', priority=10,
        template='nextgisweb:resource/template/section_summary.mako')

    Resource.__psection__.register(
        key='children', priority=20,
        title="Дочерние ресурсы",
        is_applicable=lambda obj: len(obj.children) > 0,
        template='nextgisweb:resource/template/section_children.mako')

    Resource.__psection__.register(
        key='description',
        priority=50,
        title="Описание",
        is_applicable=lambda obj: obj.description is not None,
        template='nextgisweb:resource/template/section_description.mako')

    Resource.__psection__.register(
        key='permission',
        priority=100,
        title="Права пользователя",
        template='nextgisweb:resource/template/section_permission.mako')

    # Действия

    class AddMenu(DynItem):
        def build(self, args):
            for ident, cls in Resource.registry._dict.iteritems():
                if not cls.check_parent(args.obj):
                    continue

                yield Link(
                    'create/%s' % ident,
                    cls.cls_display_name,
                    self._url(ident))

        def _url(self, cls):
            return lambda (args): args.request.route_url(
                'resource.create', id=args.obj.id,
                _query=dict(cls=cls))

    Resource.__dynmenu__ = DynMenu(
        Label('create', "Создать ресурс"),

        AddMenu(),

        Label('operation', "Операции"),

        Link(
            'operation/update', "Изменить",
            lambda args: args.request.route_url(
                'resource.update', id=args.obj.id)),

        Link(
            'operation/delete', "Удалить",
            lambda args: args.request.route_url(
                'resource.delete', id=args.obj.id)),

        Label('security', "Права доступа"),

        Link(
            'security/edit', "Редактировать",
            lambda args: args.request.route_url(
                'resource.security', id=args.obj.id)),

        Label('extra', "Дополнительно"),

        Link('extra/tree', "Дерево ресурсов",
            lambda args: args.request.route_url(
                'resource.tree', id=args.obj.id)),

        Link('extra/json', "Представление JSON",
            lambda args: args.request.route_url(
                'resource.json', id=args.obj.id)),
    )
