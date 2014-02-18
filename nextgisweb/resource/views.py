# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from pyramid.httpexceptions import HTTPFound, HTTPForbidden

from ..views import (
    ModelController,
    DescriptionObjectWidget,
    DeleteObjectWidget,
    permalinker)

from ..object_widget import ObjectWidget, CompositeWidget
from ..dynmenu import DynMenu, Label, Link, DynItem
from ..psection import PageSections
from ..pyramidcomp import viewargs

from .models import Resource, ResourceACLRule, MetaDataScope
from .scope import clscopes, scopeid
from .permission import scope_permissions
from .interface import providedBy


def resource_factory(request):

    # Вначале загружаем ресурс базового класса
    base = Resource.filter_by(id=request.matchdict['id']).one()

    # После чего загружаем ресурс того класса,
    # к которому этот ресурс и относится
    obj = Resource.query().with_polymorphic(
        Resource.registry[base.cls]).filter_by(
        id=request.matchdict['id']).one()

    return obj


class ResourceController(ModelController):
    def create_context(self, request):
        parent = Resource.filter_by(id=request.GET['parent']).one()
        request.resource_permission(parent, Resource, 'children')

        cls = Resource.registry[request.GET['cls']]

        tmpobj = cls(parent=parent, owner_user=request.user)
        request.resource_permission(tmpobj, Resource, 'create')

        return dict(
            cls=cls,
            parent=parent,
            owner_user=request.user,
            template_context=dict(
                obj=parent,
                subtitle="Новый ресурс: %s" % cls.cls_display_name),
            widget_options=dict(
                parent=parent,
                user=request.user))

    def edit_context(self, request):
        obj = Resource.filter_by(**request.matchdict).one()
        request.resource_permission(obj, MetaDataScope, 'edit')

        cls = Resource.registry[obj.cls]
        obj = cls.filter_by(resource_id=obj.id).one()

        return dict(
            obj=obj,
            cls=cls,
            template_context=dict(obj=obj)
        )

    def delete_context(self, request):
        # TODO: Права доступа
        return self.edit_context(request)

    def widget_class(self, context, operation):
        class Composite(CompositeWidget):
            model_class = context['cls']

        return Composite

    def create_object(self, context):
        return context['cls'](
            parent=context['parent'],
            owner_user=context['owner_user'])

    def query_object(self, context):
        return context['obj']

    def template_context(self, context):
        return context['template_context']


class ResourceObjectWidget(ObjectWidget):

    def is_applicable(self):
        return self.operation in ('create', 'edit')

    def populate_obj(self):
        ObjectWidget.populate_obj(self)

        self.obj.display_name = self.data['display_name']
        self.obj.keyname = self.data['keyname']

    def validate(self):
        result = ObjectWidget.validate(self)
        self.error = []

        return result

    def widget_params(self):
        result = ObjectWidget.widget_params(self)

        if self.obj:
            result['value'] = dict(
                display_name=self.obj.display_name,
                keyname=self.obj.keyname,
            )

        return result

    def widget_module(self):
        return 'ngw-resource/Widget'


@viewargs(renderer='psection.mako')
def show(request):
    request.resource_permission(request.context, Resource, 'identify')
    return dict(obj=request.context, sections=request.context.__psection__)


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

        itm = dict(
            id=res.id, cls=res.identity,
            parent_id=res.parent_id,
            display_name=res.display_name,
            keyname=res.keyname, scopes=[],
            interfaces=map(lambda i: i.getName(), providedBy(res)))

        for scope in clscopes(res.__class__):
            itm['scopes'].append(scopeid(scope))

        itm['children'] = len(res.children) > 0

        if oid is not None:
            return itm
        else:
            result.append(itm)

    return result


def setup_pyramid(comp, config):

    def resource_permission(request, resource, cls, permission):
        if not resource.has_permission(cls, permission, request.user):
            raise HTTPForbidden()

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
        lambda (r): HTTPFound(r.route_url('resource.show', id=0)))

    _resource_route('show', '{id:\d+}', client=('id', )).add_view(show)

    _resource_route('tree', '{id:\d+}/tree', client=('id', )).add_view(tree)

    _route('store', 'store/{id:\d*}', client=('id', )).add_view(store)

    permalinker(Resource, 'resource.show')

    # ACL

    _resource_route('security', '{id:\d+}/security', client=('id', )) \
        .add_view(security_get).add_view(security_put).add_view(security)

    # Виджет редактирования

    ResourceController('resource').includeme(config)

    Resource.object_widget = (
        ('resource', ResourceObjectWidget),
        ('resource:description', DescriptionObjectWidget),
        ('resource:delete', DeleteObjectWidget),
    )

    # Секции

    Resource.__psection__ = PageSections()

    Resource.__psection__.register(
        key='children',
        priority=0,
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
                    'add/%s' % ident,
                    cls.cls_display_name,
                    self._url(ident))

        def _url(self, cls):
            return lambda (args): args.request.route_url(
                'resource.create', _query=dict(
                    parent=args.obj.id, cls=cls))

    Resource.__dynmenu__ = DynMenu(
        Label('add', "Добавить"),

        AddMenu(),

        Label('operation', "Операции"),

        Link(
            'operation/edit', "Редактировать",
            lambda args: args.request.route_url(
                'resource.edit', id=args.obj.id)),

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
                'resource.tree', id=args.obj.id))
    )
