# -*- coding: utf-8 -*-
from __future__ import unicode_literals
from collections import OrderedDict
import json

from shapely import wkt
from pyramid.response import Response

from ..resource import DataScope, resource_factory

from .interface import IFeatureLayer, IWritableFeatureLayer
from .feature import Feature


PERM_READ = DataScope.read
PERM_WRITE = DataScope.write


def fserialize(f):
    result = OrderedDict(id=f.id)
    result['fields'] = f.fields
    result['geom'] = wkt.dumps(f.geom)
    return result


def iget(resource, request):
    request.resource_permission(PERM_READ)

    query = resource.feature_query()
    query.geom()

    query.filter_by(id=request.matchdict['fid'])
    query.limit(1)

    result = None
    for f in query():
        result = f

    return Response(
        json.dumps(fserialize(result)),
        content_type=b'application/json')


def iput(resource, request):
    request.resource_permission(PERM_WRITE)

    query = resource.feature_query()
    query.geom()

    query.filter_by(id=request.matchdict['fid'])
    query.limit(1)

    feature = None
    for f in query():
        feature = f

    body = request.json_body
    if 'fields' in body:
        for k, v in body['fields'].iteritems():
            feature.fields[k] = v

    if 'geom' in body:
        feature.geom = body['geom']

    resource.feature_put(feature)

    return Response(
        json.dumps(dict(id=feature.id)),
        content_type=b'application/json')


def idelete(resource, request):
    request.resource_permission(PERM_WRITE)

    fid = int(request.matchdict['fid'])
    resource.feature_delete(fid)

    return Response(json.dumps(None), content_type=b'application/json')


def cget(resource, request):
    request.resource_permission(PERM_READ)

    query = resource.feature_query()
    query.geom()

    result = map(fserialize, query())

    return Response(
        json.dumps(result),
        content_type=b'application/json')


def cpost(resource, request):
    request.resource_permission(PERM_WRITE)

    feature = Feature(layer=resource)

    body = request.json_body
    if 'fields' in body:
        for k, v in body['fields'].iteritems():
            feature.fields[k] = v

    if 'geom' in body:
        feature.geom = body['geom']

    fid = resource.feature_create(feature)

    return Response(
        json.dumps(dict(id=fid)),
        content_type=b'application/json')


def setup_pyramid(comp, config):

    # TODO: В add_view так же нужно проверять наличие интерфейсов
    # IFeatureLayer и IWritableFeatureLayer, но похоже одновременное указание
    # request_method и context сейчас в pyramid не работает.

    config.add_route(
        'feature_layer.feature.item', '/api/resource/{id}/feature/{fid}',
        factory=resource_factory, client=('id', 'fid')) \
        .add_view(iget, request_method='GET') \
        .add_view(iput, request_method='PUT') \
        .add_view(idelete, request_method='DELETE')

    config.add_route(
        'feature_layer.feature.collection', '/api/resource/{id}/feature/',
        factory=resource_factory, client=('id', )) \
        .add_view(cget, request_method='GET') \
        .add_view(cpost, request_method='POST')
