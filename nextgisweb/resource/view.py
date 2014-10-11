# -*- coding: utf-8 -*-
from __future__ import unicode_literals
import warnings
import json
from collections import OrderedDict

from pyramid.response import Response
from pyramid import httpexceptions

from sqlalchemy.orm.exc import NoResultFound

from ..models import DBSession

from ..views import permalinker
from ..dynmenu import DynMenu, Label, Link, DynItem
from ..psection import PageSections
from ..pyramidcomp import viewargs

from .model import (
    Resource,
    ResourceSerializer)
from .exception import ResourceError, ValidationError, ForbiddenError
from .permission import Permission, Scope
from .scope import ResourceScope
from .serialize import CompositeSerializer
from .widget import CompositeWidget

__all__ = ['resource_factory', ]

PERM_READ = ResourceScope.read
PERM_DELETE = ResourceScope.delete
PERM_CPERMISSIONS = ResourceScope.change_permissions
PERM_MCHILDREN = ResourceScope.manage_children


def resource_factory(request):
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
                subtitle="Представление JSON",
                objjson=serializer.data)


@viewargs(renderer='json', json=True)
def schema(request):
    resources = dict()
    scopes = dict()

    for cls in Resource.registry:
        resources[cls.identity] = dict(
            identity=cls.identity,
            label=cls.cls_display_name,
            scopes=cls.scope.keys())

    for k, scp in Scope.registry.iteritems():
        spermissions = dict()
        for p in scp.itervalues():
            spermissions[p.name] = dict(label=p.label)

        scopes[k] = dict(
            identity=k, label=scp.label,
            permissions=spermissions)

    return dict(resources=resources, scopes=scopes)


@viewargs(renderer='nextgisweb:resource/template/tree.mako')
def tree(request):
    obj = request.context
    return dict(
        obj=obj, maxwidth=True, maxheight=True,
        subtitle="Дерево ресурсов")


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


def exception_to_response(exception):
    data = dict(ecls=exception.__class__.__name__)

    # Выбираем более подходящие HTTP-коды, впрочем зачем это нужно
    # сейчас не очень понимаю - можно было и одним ограничиться.

    scode = 500

    if isinstance(exception, ValidationError):
        scode = 400

    if isinstance(exception, ForbiddenError):
        scode = 403

    # Общие атрибуты для идентификации того где произошла ошибка,
    # устанавливаются внутри CompositeSerializer и Serializer.

    if hasattr(exception, '__srlzr_cls__'):
        data['serializer'] = exception.__srlzr_cls__.identity

    if hasattr(exception, '__srlzr_prprt__'):
        data['attr'] = exception.__srlzr_prprt__

    if isinstance(exception, ResourceError):

        # Только для потомков ResourceError можно передавать сообщение
        # пользователю как есть, в остальных случаях это может быть
        # небезопасно, там могут быть куски SQL запросов или какие-то
        # внутренние данные.

        data['message'] = exception.message

    else:

        # Для всех остальных генерируем универсальное сообщение об ошибке на
        # основании имени класса исключительной ситуации.

        data['message'] = "Неизвестная исключительная ситуация %s" \
            % exception.__class__.__name__

        data['message'] += ", cериализатор %s" % data['serializer'] \
            if 'serializer' in data else ''

        data['message'] += ", атрибут %s" % data['attr'] \
            if 'attr' in data else ''

        data['message'] += "."

    return Response(
        json.dumps(data), status_code=scode,
        content_type=b'application/json')


def resexc_tween_factory(handler, registry):
    """ Tween factory для перехвата исключительных ситуаций API ресурса

    Исключительная ситуация может возникнуть уже как во время выполнения
    flush так и во время commit. Если flush еще можно вызвать явно, то
    вызов commit в любом случае происходит не явно через pyramid_tm. Для
    того, чтобы отловить эти ситуации используется pyramid tween, которая
    регистрируется поверх pyramid_tm (см. setup_pyramid).

    После перехвата ошибки для нее генерируется представление в виде JSON
    при помощи exception_to_response. """

    def resource_exception_tween(request):
        try:
            response = handler(request)
        except Exception as exc:
            if request.matched_route and request.matched_route.name == 'resource.child':
                return exception_to_response(exc)
            raise
        return response

    return resource_exception_tween


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

    result = serializer.deserialize()
    DBSession.flush()

    return Response(
        json.dumps(result), status_code=200,
        content_type=b'application/json')


def child_post(request):
    child_id = request.matchdict['child_id']
    assert child_id == ''

    data = request.json_body

    data['resource']['parent'] = dict(id=request.context.id)

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

    return Response(
        json.dumps(data), status_code=201,
        content_type=b'application/json', headerlist=[
            (b"Location", bytes(location)), ])


def child_delete(request):
    child_id = request.matchdict['child_id']
    assert child_id != ''

    child = Resource.query().with_polymorphic('*') \
        .filter_by(id=child_id).one()

    def delete(obj):
        request.resource_permission(PERM_MCHILDREN, obj)
        for chld in obj.children:
            delete(chld)

        request.resource_permission(PERM_DELETE, obj)
        DBSession.delete(obj)

    with DBSession.no_autoflush:
        delete(child)

    DBSession.flush()

    return Response(
        json.dumps(None), status_code=200,
        content_type=b'application/json')


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

    _resource_route('child', '{id:\d+|-}/child/{child_id:\d*}',
                    client=('id', 'child_id')) \
        .add_view(child_get, method=r'GET') \
        .add_view(child_patch, method=(r'PUT', r'PATCH')) \
        .add_view(child_post, method=r'POST') \
        .add_view(child_delete, method=r'DELETE')

    config.add_tween(
        'nextgisweb.resource.view.resexc_tween_factory',
        over='pyramid_tm.tm_tween_factory')

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

        Label('extra', "Дополнительно"),

        Link('extra/tree', "Дерево ресурсов",
            lambda args: args.request.route_url(
                'resource.tree', id=args.obj.id)),

        Link('extra/json', "Представление JSON",
            lambda args: args.request.route_url(
                'resource.json', id=args.obj.id)),
    )
