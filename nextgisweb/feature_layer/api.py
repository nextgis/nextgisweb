# -*- coding: utf-8 -*-
from __future__ import unicode_literals
from collections import OrderedDict
import json
from datetime import date, time, datetime

from shapely import wkt
from pyramid.response import Response

from ..resource import DataScope, resource_factory

from .interface import IFeatureLayer, IWritableFeatureLayer, FIELD_TYPE
from .feature import Feature
from .extension import FeatureExtension


PERM_READ = DataScope.read
PERM_WRITE = DataScope.write


def deserialize(feat, data):
    if 'geom' in data:
        feat.geom = data['geom']

    if 'fields' in data:
        fdata = data['fields']

        for fld in feat.layer.fields:

            if fld.keyname in fdata:
                val = fdata[fld.keyname]

                if val is None:
                    fval = None

                elif fld.datatype == FIELD_TYPE.DATE:
                    fval = date(
                        int(val['year']),
                        int(val['month']),
                        int(val['day']))

                elif fld.datatype == FIELD_TYPE.TIME:
                    fval = time(
                        int(val['hour']),
                        int(val['minute']),
                        int(val['second']))

                elif fld.datatype == FIELD_TYPE.DATETIME:
                    fval = datetime(
                        int(val['year']),
                        int(val['month']),
                        int(val['day']),
                        int(val['hour']),
                        int(val['minute']),
                        int(val['second']))

                else:
                    fval = val

                feat.fields[fld.keyname] = fval

    if 'extensions' in data:
        for cls in FeatureExtension.registry:
            if cls.identity in data['extensions']:
                ext = cls(feat.layer)
                ext.deserialize(feat, data['extensions'][cls.identity])


def serialize(feat):
    result = OrderedDict(id=feat.id)
    result['geom'] = wkt.dumps(feat.geom)

    result['fields'] = OrderedDict()
    for fld in feat.layer.fields:

        val = feat.fields[fld.keyname]

        if val is None:
            fval = None

        elif fld.datatype == FIELD_TYPE.DATE:
            fval = OrderedDict((
                ('year', val.year),
                ('month', val.month),
                ('day', val.day)))

        elif fld.datatype == FIELD_TYPE.TIME:
            fval = OrderedDict((
                ('hour', val.hour),
                ('minute', val.minute),
                ('second', val.second)))

        elif fld.datatype == FIELD_TYPE.DATETIME:
            fval = OrderedDict((
                ('year', val.year),
                ('month', val.month),
                ('day', val.day),
                ('hour', val.hour),
                ('minute', val.minute),
                ('second', val.second)))

        else:
            fval = val

        result['fields'][fld.keyname] = fval

    result['extensions'] = OrderedDict()
    for cls in FeatureExtension.registry:
        ext = cls(feat.layer)
        result['extensions'][cls.identity] = ext.serialize(feat)

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
        json.dumps(serialize(result)),
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

    deserialize(feature, request.json_body)
    if IWritableFeatureLayer.providedBy(resource):
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

    result = map(serialize, query())

    return Response(
        json.dumps(result),
        content_type=b'application/json')


def cpost(resource, request):
    request.resource_permission(PERM_WRITE)

    feature = Feature(layer=resource)
    deserialize(feature, request.json_body)
    fid = resource.feature_create(feature)

    return Response(
        json.dumps(dict(id=fid)),
        content_type=b'application/json')


def cdelete(resource, request):
    request.resource_permission(PERM_WRITE)
    resource.feature_delete_all()

    return Response(json.dumps(None), content_type=b'application/json')


def count(resource, request):
    request.resource_permission(PERM_READ)

    query = resource.feature_query()
    total_count = query().total_count

    return Response(
        json.dumps(dict(total_count=total_count)),
        content_type=b'application/json')


def setup_pyramid(comp, config):

    config.add_route(
        'feature_layer.feature.item', '/api/resource/{id}/feature/{fid}',
        factory=resource_factory) \
        .add_view(iget, context=IFeatureLayer, request_method='GET') \
        .add_view(iput, context=IFeatureLayer, request_method='PUT') \
        .add_view(idelete, context=IWritableFeatureLayer, request_method='DELETE')

    config.add_route(
        'feature_layer.feature.collection', '/api/resource/{id}/feature/',
        factory=resource_factory) \
        .add_view(cget, context=IFeatureLayer, request_method='GET') \
        .add_view(cpost, context=IWritableFeatureLayer, request_method='POST') \
        .add_view(cdelete, context=IWritableFeatureLayer, request_method='DELETE')

    config.add_route(
        'feature_layer.feature.count', '/api/resource/{id}/feature_count',
        factory=resource_factory) \
        .add_view(count, context=IFeatureLayer, request_method='GET')
