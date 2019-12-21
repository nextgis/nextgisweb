# -*- coding: utf-8 -*-
from __future__ import unicode_literals
from collections import OrderedDict

from pyramid.httpexceptions import HTTPNotFound
from geoalchemy2.shape import to_shape

from ..models import DBSession
from ..resource import resource_factory

from .model import (
    WebMap,
    WebMapScope,
    WebMapAnnotation,
)


def annotation_to_dict(obj):
    result = OrderedDict()
    for k in ('id', 'description', 'style', 'geom'):
        v = getattr(obj, k)
        if k == 'geom':
            v = to_shape(v).wkt
        if v is not None:
            result[k] = v
    return result


def annotation_from_dict(obj, data):
    for k in ('description', 'style', 'geom'):
        if k in data:
            v = data[k]
            if k == 'geom':
                v = 'SRID=3857;' + v
            setattr(obj, k, v)


def check_annotation_enabled(request):
    if not request.env.webmap.settings['annotation']:
        raise HTTPNotFound()


def annotation_cget(resource, request):
    check_annotation_enabled(request)
    request.resource_permission(WebMapScope.annotation_read)
    return map(annotation_to_dict, resource.annotations)


def annotation_cpost(resource, request):
    check_annotation_enabled(request)
    request.resource_permission(WebMapScope.annotation_write)
    obj = WebMapAnnotation()
    annotation_from_dict(obj, request.json_body)
    resource.annotations.append(obj)
    DBSession.flush()
    return dict(id=obj.id)


def annotation_iget(resource, request):
    check_annotation_enabled(request)
    request.resource_permission(WebMapScope.annotation_read)
    obj = WebMapAnnotation.filter_by(webmap_id=resource.id, id=int(request.matchdict['annotation_id'])).one()
    return annotation_to_dict(obj)


def annotation_iput(resource, request):
    check_annotation_enabled(request)
    request.resource_permission(WebMapScope.annotation_write)
    obj = WebMapAnnotation.filter_by(webmap_id=resource.id, id=int(request.matchdict['annotation_id'])).one()
    annotation_from_dict(obj, request.json_body)
    return dict(id=obj.id)


def annotation_idelete(resource, request):
    check_annotation_enabled(request)
    request.resource_permission(WebMapScope.annotation_write)
    obj = WebMapAnnotation.filter_by(webmap_id=resource.id, id=int(request.matchdict['annotation_id'])).one()
    DBSession.delete(obj)
    return None


def setup_pyramid(comp, config):
    setup_annotations(config)


def setup_annotations(config):
    config.add_route(
        'webmap.annotation.collection', '/api/resource/{id:\d+}/annotation/',
        factory=resource_factory, client=('id',)
    ) \
        .add_view(annotation_cget, context=WebMap, request_method='GET', renderer='json') \
        .add_view(annotation_cpost, context=WebMap, request_method='POST', renderer='json')

    config.add_route(
        'webmap.annotation.item', '/api/resource/{id:\d+}/annotation/{annotation_id:\d+}',
        factory=resource_factory, client=('id', 'annotation_id')
    ) \
        .add_view(annotation_iget, context=WebMap, request_method='GET', renderer='json') \
        .add_view(annotation_iput, context=WebMap, request_method='PUT', renderer='json') \
        .add_view(annotation_idelete, context=WebMap, request_method='DELETE', renderer='json')
