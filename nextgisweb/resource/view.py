# -*- coding: utf-8 -*-
from __future__ import unicode_literals
import warnings

from pyramid import httpexceptions

from sqlalchemy.orm.exc import NoResultFound


from ..views import permalinker
from ..dynmenu import DynMenu, Label, Link, DynItem
from ..psection import PageSections
from ..pyramid import viewargs

from .model import Resource, ResourceSerializer
from .permission import Permission, Scope
from .scope import ResourceScope
from .serialize import CompositeSerializer
from .widget import CompositeWidget
from .util import _

__all__ = ['resource_factory', ]

PERM_READ = ResourceScope.read
PERM_DELETE = ResourceScope.delete
PERM_CPERMISSIONS = ResourceScope.change_permissions
PERM_MCHILDREN = ResourceScope.manage_children


def resource_factory(request):
    # TODO: Хотелось бы использовать первый ключ, но этого не получится,
    # поскольку matchdiсt не сохраняет порядок ключей.

    if request.matchdict['id'] == '-':
        return None

    # Вначале загружаем ресурс базового класса
    try:
        base = Resource.filter_by(id=request.matchdict['id']).one()
    except NoResultFound:
        raise httpexceptions.HTTPNotFound()

    # После чего загружаем ресурс того класса,
    # к которому этот ресурс и относится
    obj = Resource.query().with_polymorphic(
        Resource.registry[base.cls]).filter_by(
        id=request.matchdict['id']).one()

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


# TODO: Перенести в API и избавиться от json=True
@viewargs(renderer='json', json=True)
def schema(request):
    resources = dict()
    scopes = dict()

    for cls in Resource.registry:
        resources[cls.identity] = dict(
            identity=cls.identity,
            label=request.localizer.translate(cls.cls_display_name),
            scopes=cls.scope.keys())

    for k, scp in Scope.registry.iteritems():
        spermissions = dict()
        for p in scp.itervalues():
            spermissions[p.name] = dict(
                label=request.localizer.translate(p.label))

        scopes[k] = dict(
            identity=k, permissions=spermissions,
            label=request.localizer.translate(scp.label))

    return dict(resources=resources, scopes=scopes)


@viewargs(renderer='nextgisweb:resource/template/tree.mako')
def tree(request):
    obj = request.context
    return dict(
        obj=obj, maxwidth=True, maxheight=True,
        subtitle=_("Resource tree"))


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
        if not res.has_permission(PERM_READ, request.user):
            continue

        serializer = ResourceSerializer(res, request.user)
        serializer.serialize()
        itm = serializer.data

        if oid is not None:
            return itm
        else:
            result.append(itm)

    return result


@viewargs(renderer='nextgisweb:resource/template/composite_widget.mako')
def create(request):
    return dict(obj=request.context, subtitle=_("Create resource"), maxheight=True,
                query=dict(operation='create', cls=request.GET.get('cls'),
                           parent=request.context.id))


@viewargs(renderer='nextgisweb:resource/template/composite_widget.mako')
def update(request):
    return dict(obj=request.context, subtitle=_("Update resource"), maxheight=True,
                query=dict(operation='update', id=request.context.id))


@viewargs(renderer='nextgisweb:resource/template/composite_widget.mako')
def delete(request):
    return dict(obj=request.context, subtitle=_("Delete resource"), maxheight=True,
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

    def resource_permission(request, permission, resource=None):

        if isinstance(resource, Permission):
            warnings.warn(
                'Deprecated argument order for resource_permission. ' +
                'Use request.resource_permission(permission, resource).',
                stacklevel=2)

            permission, resource = resource, permission

        if resource is None:
            resource = request.context

        if not resource.has_permission(permission, request.user):
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

    _route('widget', 'widget', client=()).add_view(widget)

    # CRUD
    _resource_route('create', '{id:\d+}/create', client=('id', )) \
        .add_view(create)
    _resource_route('update', '{id:\d+}/update', client=('id', )) \
        .add_view(update)
    _resource_route('delete', '{id:\d+}/delete', client=('id', )) \
        .add_view(delete)

    permalinker(Resource, 'resource.show')

    # Секции

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
        Label('create', _("Create resource")),

        AddMenu(),

        Label('operation', _("Action")),

        Link(
            'operation/update', _("Update"),
            lambda args: args.request.route_url(
                'resource.update', id=args.obj.id)),

        Link(
            'operation/delete', _("Delete"),
            lambda args: args.request.route_url(
                'resource.delete', id=args.obj.id)),

        Label('extra', _("Extra")),

        Link(
            'extra/tree', _("Resource tree"),
            lambda args: args.request.route_url(
                'resource.tree', id=args.obj.id)),

        Link(
            'extra/json', _("JSON view"),
            lambda args: args.request.route_url(
                'resource.json', id=args.obj.id)),
    )
