# -*- coding: utf-8 -*-
from __future__ import unicode_literals
import sys
import json
import traceback
from collections import OrderedDict

from pyramid.response import Response

from ..env import env
from ..models import DBSession
from ..pyramidcomp import viewargs

from .model import Resource
from .scope import ResourceScope
from .exception import ResourceError, ValidationError, ForbiddenError
from .serialize import CompositeSerializer
from .view import resource_factory


PERM_READ = ResourceScope.read
PERM_DELETE = ResourceScope.delete
PERM_MCHILDREN = ResourceScope.manage_children


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


def child_put(request):
    child_id = request.matchdict['child_id']
    assert child_id != ''

    data = request.json_body

    child = Resource.query().with_polymorphic('*') \
        .filter_by(id=child_id).one()

    serializer = CompositeSerializer(child, request.user, data)

    with DBSession.no_autoflush:
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

    with DBSession.no_autoflush:
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


def exception_to_response(exc_type, exc_value, exc_traceback):
    data = dict(ecls=exc_value.__class__.__name__)

    # Выбираем более подходящие HTTP-коды, впрочем зачем это нужно
    # сейчас не очень понимаю - можно было и одним ограничиться.

    scode = 500

    if isinstance(exc_value, ValidationError):
        scode = 400

    if isinstance(exc_value, ForbiddenError):
        scode = 403

    # Общие атрибуты для идентификации того где произошла ошибка,
    # устанавливаются внутри CompositeSerializer и Serializer.

    if hasattr(exc_value, '__srlzr_cls__'):
        data['serializer'] = exc_value.__srlzr_cls__.identity

    if hasattr(exc_value, '__srlzr_prprt__'):
        data['attr'] = exc_value.__srlzr_prprt__

    if isinstance(exc_value, ResourceError):

        # Только для потомков ResourceError можно передавать сообщение
        # пользователю как есть, в остальных случаях это может быть
        # небезопасно, там могут быть куски SQL запросов или какие-то
        # внутренние данные.

        data['message'] = exc_value.message

    else:

        # Для всех остальных генерируем универсальное сообщение об ошибке на
        # основании имени класса исключительной ситуации.

        data['message'] = "Неизвестная исключительная ситуация %s" \
            % exc_value.__class__.__name__

        data['message'] += ", cериализатор %s" % data['serializer'] \
            if 'serializer' in data else ''

        data['message'] += ", атрибут %s" % data['attr'] \
            if 'attr' in data else ''

        data['message'] += "."

        # Ошибка неожиданная, имеет смысл дать возможность ее записать.

        env.resource.logger.error(
            exc_type.__name__ + ': ' + exc_value.message + "\n"
            + ''.join(traceback.format_tb(exc_traceback)))

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
        except:
            mroute = request.matched_route
            if mroute and mroute.name in (
                'resource.child',
                'resource.item',
                'resource.collection'
            ):
                return exception_to_response(*sys.exc_info())
            raise
        return response

    return resource_exception_tween


def item_get(context, request):
    request.resource_permission(PERM_READ)

    serializer = CompositeSerializer(context, request.user)
    serializer.serialize()

    return Response(
        json.dumps(serializer.data), status_code=200,
        content_type=b'application/json')


def item_put(context, request):
    request.resource_permission(PERM_READ)

    serializer = CompositeSerializer(context, request.user, request.json_body)
    with DBSession.no_autoflush:
        result = serializer.deserialize()

    return Response(
        json.dumps(result), status_code=200,
        content_type=b'application/json')


def setup_pyramid(comp, config):

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

    _resource_route('child', '{id:\d+|-}/child/{child_id:\d*}',
                    client=('id', 'child_id')) \
        .add_view(child_get, method=r'GET') \
        .add_view(child_put, method=(r'PUT', r'PATCH')) \
        .add_view(child_post, method=r'POST') \
        .add_view(child_delete, method=r'DELETE')

    config.add_route(
        'resource.item', '/api/resource/{id:\d+}',
        factory=resource_factory, client=('id', )) \
        .add_view(item_get, request_method='GET') \
        .add_view(item_put, request_method=('PUT', 'POST'))

    config.add_tween(
        'nextgisweb.resource.api.resexc_tween_factory',
        over='pyramid_tm.tm_tween_factory')
