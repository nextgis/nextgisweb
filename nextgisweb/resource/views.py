# -*- coding: utf-8 -*-
from __future__ import unicode_literals
import json
from collections import OrderedDict

from pyramid.response import Response
from pyramid.httpexceptions import HTTPFound, HTTPForbidden

from ..models import DBSession

from ..views import (
    ModelController,
    DescriptionObjectWidget,
    DeleteObjectWidget,
    permalinker)
from ..object_widget import ObjectWidget, CompositeWidget
from ..dynmenu import DynMenu, Label, Link, DynItem
from ..psection import PageSections
from ..pyramidcomp import viewargs

from .model import (
    Resource,
    ResourceACLRule,
    MetaDataScope,
    ResourceSerializer)
from .scope import clscopes, scopeid
from .permission import scope_permissions
from .serialize import CompositeSerializer


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
        itm = serializer.serialize()

        if oid is not None:
            return itm
        else:
            result.append(itm)

    return result


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


@viewargs(renderer='json', json=True)
def child_patch(request):
    child_id = request.matchdict['child_id']
    assert child_id != ''

    data = request.json_body

    child = Resource.query().with_polymorphic('*') \
        .filter_by(id=child_id).one()

    serializer = CompositeSerializer(child, request.user, data)
    result = serializer.deserialize()

    return result


def child_post(request):
    child_id = request.matchdict['child_id']
    assert child_id == ''

    data = request.json_body

    cls = Resource.registry[data['resource']['cls']]
    child = cls(owner_user=request.user)

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

    return Response(json.dumps(data), status_code=201, headerlist=[
        (b"Content-Type", b"application/json"),
        (b"Location", bytes(location))])


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

    _resource_route('json', '{id:\d+}/json', client=('id', )) \
        .add_view(objjson)

    _resource_route('tree', '{id:\d+}/tree', client=('id', )).add_view(tree)

    _route('store', 'store/{id:\d*}', client=('id', )).add_view(store)

    _resource_route('child', '{id:\d+|-}/child/{child_id:\d*}') \
        .add_view(child_get, method='GET') \
        .add_view(child_patch, method='PATCH') \
        .add_view(child_post, method='POST')

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
                    'add/%s' % ident,
                    cls.cls_display_name,
                    self._url(ident))

        def _url(self, cls):
            return lambda (args): args.request.route_url(
                'resource.create', _query=dict(
                    parent=args.obj.id, cls=cls))

    Resource.__dynmenu__ = DynMenu(
        Label('add', "Добавить ресурс"),

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
                'resource.tree', id=args.obj.id)),

        Link('extra/json', "Представление JSON",
            lambda args: args.request.route_url(
                'resource.json', id=args.obj.id)),
    )
