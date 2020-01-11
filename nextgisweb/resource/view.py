# -*- coding: utf-8 -*-
from __future__ import unicode_literals
import warnings
import six

from pyramid import httpexceptions
from sqlalchemy import bindparam
from sqlalchemy.orm import joinedload
from sqlalchemy.orm.exc import NoResultFound
import sqlalchemy.ext.baked

from ..views import permalinker
from ..dynmenu import DynMenu, Label, Link, DynItem
from ..psection import PageSections
from ..pyramid import viewargs
from ..models import DBSession

from ..core.exception import InsufficientPermissions

from .exception import ResourceNotFound
from .model import Resource
from .permission import Permission, Scope
from .scope import ResourceScope
from .serialize import CompositeSerializer
from .widget import CompositeWidget
from .util import _

__all__ = ['resource_factory', ]

PERM_CREATE = ResourceScope.create
PERM_READ = ResourceScope.read
PERM_UPDATE = ResourceScope.update
PERM_DELETE = ResourceScope.delete
PERM_CPERMISSIONS = ResourceScope.change_permissions
PERM_MCHILDREN = ResourceScope.manage_children


_rf_bakery = sqlalchemy.ext.baked.bakery()


def resource_factory(request):
    # TODO: We'd like to use first key, but can't
    # as matchdiсt doesn't save keys order.

    if request.matchdict['id'] == '-':
        return None

    bq_res_cls = _rf_bakery(
        lambda session: session.query(
            Resource.cls).filter_by(
                id=bindparam('id')))

    # First, load base class resource
    res_id = int(request.matchdict['id'])

    try:
        res_cls, = bq_res_cls(DBSession()).params(id=res_id).one()
    except NoResultFound:
        raise ResourceNotFound(res_id)

    # Second, load resource of it's class
    bq_obj = _rf_bakery(
        lambda session: session.query(Resource).with_polymorphic(
            Resource.registry[res_cls]
        ).options(
            joinedload(Resource.owner_user),
            joinedload(Resource.parent),
        ).filter_by(id=bindparam('id')), res_cls)

    obj = bq_obj(DBSession()).params(id=res_id).one()
    return obj


@viewargs(renderer='psection.mako')
def show(request):
    request.resource_permission(PERM_READ)
    return dict(obj=request.context, sections=request.context.__psection__)


@viewargs(renderer='nextgisweb:resource/template/json.mako')
def objjson(request):
    request.resource_permission(PERM_READ)
    serializer = CompositeSerializer(obj=request.context, user=request.user)
    serializer.serialize()
    return dict(obj=request.context,
                subtitle=_("JSON view"),
                objjson=serializer.data)


# TODO: Move to API and get rid of json=True
@viewargs(renderer='json', json=True)
def schema(request):
    resources = dict()
    scopes = dict()

    for cls in Resource.registry:
        resources[cls.identity] = dict(
            identity=cls.identity,
            label=request.localizer.translate(cls.cls_display_name),
            scopes=list(cls.scope.keys()))

    for k, scp in six.iteritems(Scope.registry):
        spermissions = dict()
        for p in scp.values():
            spermissions[p.name] = dict(
                label=request.localizer.translate(p.label))

        scopes[k] = dict(
            identity=k, permissions=spermissions,
            label=request.localizer.translate(scp.label))

    return dict(resources=resources, scopes=scopes)


# TODO: Remove deprecated useless page
@viewargs(renderer='nextgisweb:resource/template/tree.mako')
def tree(request):
    obj = request.context
    return dict(
        obj=obj, maxwidth=True, maxheight=True,
        subtitle=_("Resource tree"))


@viewargs(renderer='nextgisweb:resource/template/composite_widget.mako')
def create(request):
    request.resource_permission(PERM_MCHILDREN)
    return dict(obj=request.context, subtitle=_("Create resource"), maxheight=True,
                query=dict(operation='create', cls=request.GET.get('cls'),
                           parent=request.context.id))


@viewargs(renderer='nextgisweb:resource/template/composite_widget.mako')
def update(request):
    request.resource_permission(PERM_UPDATE)
    return dict(obj=request.context, subtitle=_("Update resource"), maxheight=True,
                query=dict(operation='update', id=request.context.id))


@viewargs(renderer='nextgisweb:resource/template/composite_widget.mako')
def delete(request):
    request.resource_permission(PERM_DELETE)
    return dict(obj=request.context, subtitle=_("Delete resource"), maxheight=True,
                query=dict(operation='delete', id=request.context.id))


@viewargs(renderer='json')
def widget(request):
    operation = request.GET.get('operation', None)
    resid = request.GET.get('id', None)
    clsid = request.GET.get('cls', None)
    parent_id = request.GET.get('parent', None)

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

    def resource_permission(request, permission, resource=None):

        if isinstance(resource, Permission):
            warnings.warn(
                'Deprecated argument order for resource_permission. '
                'Use request.resource_permission(permission, resource).',
                stacklevel=2)

            permission, resource = resource, permission

        if resource is None:
            resource = request.context

        if not resource.has_permission(permission, request.user):
            raise InsufficientPermissions(
                _("Insufficient '%s' permission in scope '%s' on resource id = %d.") % (
                    permission.name, permission.scope.identity, resource.id
                ), data=dict(
                    resource=dict(id=resource.id),
                    permission=permission.name,
                    scope=permission.scope.identity))

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
        lambda r: httpexceptions.HTTPFound(
            r.route_url('resource.show', id=0)))

    _resource_route('show', r'{id:\d+}', client=('id', )).add_view(show)

    _resource_route('json', r'{id:\d+}/json', client=('id', )) \
        .add_view(objjson)

    _resource_route('tree', r'{id:\d+}/tree', client=('id', )).add_view(tree)

    _route('widget', 'widget', client=()).add_view(widget)

    # CRUD
    _resource_route('create', r'{id:\d+}/create', client=('id', )) \
        .add_view(create)
    _resource_route('update', r'{id:\d+}/update', client=('id', )) \
        .add_view(update)
    _resource_route('delete', r'{id:\d+}/delete', client=('id', )) \
        .add_view(delete)

    permalinker(Resource, 'resource.show')

    # Sections

    Resource.__psection__ = PageSections()

    Resource.__psection__.register(
        key='summary', priority=10,
        template='nextgisweb:resource/template/section_summary.mako')

    Resource.__psection__.register(
        key='children', priority=20,
        title=_("Child resources"),
        is_applicable=lambda obj: len(obj.children) > 0,
        template='nextgisweb:resource/template/section_children.mako')

    Resource.__psection__.register(
        key='description',
        priority=50,
        title=_("Description"),
        is_applicable=lambda obj: obj.description is not None,
        template='nextgisweb:resource/template/section_description.mako')

    Resource.__psection__.register(
        key='permission',
        priority=100,
        title=_("User permissions"),
        template='nextgisweb:resource/template/section_permission.mako')

    # Actions

    class ResourceMenu(DynItem):
        def build(self, args):
            permissions = args.obj.permissions(args.request.user)
            for ident, cls in six.iteritems(Resource.registry._dict):
                if ident in comp.options['disabled_cls']:
                    continue

                if not cls.check_parent(args.obj):
                    continue

                # Is current user has permission to manage resource children?
                if PERM_MCHILDREN not in permissions:
                    continue

                # Is current user has permission to create child resource?
                child = cls(parent=args.obj, owner_user=args.request.user)
                if not child.has_permission(PERM_CREATE, args.request.user):
                    continue

                # Workaround SAWarning: Object of type ... not in session,
                # add operation along 'Resource.children' will not proceed
                child.parent = None

                yield Link(
                    'create/%s' % ident,
                    cls.cls_display_name,
                    self._url(ident),
                    cls.identity)

            if PERM_UPDATE in permissions:
                yield Link(
                    'operation/update', _("Update"),
                    lambda args: args.request.route_url(
                        'resource.update', id=args.obj.id))

            if PERM_DELETE in permissions:
                yield Link(
                    'operation/delete', _("Delete"),
                    lambda args: args.request.route_url(
                        'resource.delete', id=args.obj.id))

            if PERM_READ in permissions:
                yield Link(
                    'extra/json', _("JSON view"),
                    lambda args: args.request.route_url(
                        'resource.json', id=args.obj.id))

        def _url(self, cls):
            return lambda args: args.request.route_url(
                'resource.create', id=args.obj.id,
                _query=dict(cls=cls))

    Resource.__dynmenu__ = DynMenu(
        Label('create', _("Create resource")),
        Label('operation', _("Action")),
        Label('extra', _("Extra")),

        ResourceMenu(),
    )
