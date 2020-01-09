# -*- coding: utf-8 -*-
from __future__ import division, absolute_import, print_function, unicode_literals
import json
import os
import re
import uuid
import zipfile
import itertools
from six.moves.urllib.parse import unquote

import backports.tempfile
from collections import OrderedDict
from datetime import datetime, date, time
from io import BytesIO

from osgeo import ogr, gdal
from shapely import wkt
from shapely.geometry import mapping
from pyramid.response import Response
from pyramid.httpexceptions import HTTPNoContent

from ..geometry import geom_from_wkt, box
from ..resource import DataScope, ValidationError, Resource, resource_factory
from ..spatial_ref_sys import SRS
from .. import geojson

from .interface import (
    IFeatureLayer,
    IWritableFeatureLayer,
    IFeatureQueryClipByBox,
    IFeatureQuerySimplify,
    FIELD_TYPE)
from .feature import Feature
from .extension import FeatureExtension
from .ogrdriver import EXPORT_FORMAT_OGR
from .exception import FeatureNotFound
from .util import _


PERM_READ = DataScope.read
PERM_WRITE = DataScope.write


def _ogr_memory_ds():
    return gdal.GetDriverByName(b'Memory').Create(
        b'', 0, 0, 0, gdal.GDT_Unknown)


def _ogr_ds(driver, options):
    return ogr.GetDriverByName(driver).CreateDataSource(
        "/vsimem/%s" % uuid.uuid4(), options=options
    )


def _ogr_layer_from_features(layer, features, name=b'', ds=None, fid=None):
    ogr_layer = layer.to_ogr(ds, name=name, fid=fid)
    layer_defn = ogr_layer.GetLayerDefn()

    for f in features:
        ogr_layer.CreateFeature(
            f.to_ogr(layer_defn, fid=fid))

    return ogr_layer


def view_geojson(request):
    request.GET["format"] = EXPORT_FORMAT_OGR["GEOJSON"].extension
    request.GET["zipped"] = "false"

    return export(request)


def export(request):
    request.resource_permission(PERM_READ)

    srs = int(
        request.GET.get("srs", request.context.srs.id)
    )
    srs = SRS.filter_by(id=srs).one()
    fid = request.GET.get("fid")
    format = request.GET.get("format")
    encoding = request.GET.get("encoding")
    zipped = request.GET.get("zipped", "true")
    zipped = zipped.lower() == "true"

    if format is None:
        raise ValidationError(
            _("Output format is not provided.")
        )
    else:
        format = format.upper()

    if format not in EXPORT_FORMAT_OGR:
        raise ValidationError(
            _("Format '%s' is not supported.") % (format,)
        )

    driver = EXPORT_FORMAT_OGR[format]

    # layer creation options
    lco = list(driver.options or [])

    if encoding is not None:
        lco.append("ENCODING=%s" % encoding)

    query = request.context.feature_query()
    query.geom()

    ogr_ds = _ogr_memory_ds()
    ogr_layer = _ogr_layer_from_features(
        request.context, query(), ds=ogr_ds, fid=fid)

    buf = BytesIO()

    with backports.tempfile.TemporaryDirectory() as temp_dir:
        filename = "%d.%s" % (
            request.context.id,
            driver.extension,
        )

        vtopts = [
            '-f', driver.name,
            '-t_srs', srs.wkt,
        ] + list(itertools.chain(*[('-lco', o) for o in lco]))

        if driver.fid_support and fid is None:
            vtopts.append('-preserve_fid')

        gdal.VectorTranslate(
            os.path.join(temp_dir, filename), ogr_ds,
            options=gdal.VectorTranslateOptions(options=vtopts)
        )

        if zipped or not driver.single_file:
            with zipfile.ZipFile(
                buf, "w", zipfile.ZIP_DEFLATED
            ) as zipf:
                for root, dirs, files in os.walk(temp_dir):
                    for file in files:
                        path = os.path.join(root, file)
                        zipf.write(
                            path, os.path.basename(path)
                        )

            content_type = "application/zip"
            filename = "%s.zip" % (filename,)

        else:
            content_type = (
                driver.mime or "application/octet-stream"
            )
            with open(
                os.path.join(temp_dir, filename)
            ) as f:
                buf.write(f.read())

    content_disposition = (
        b"attachment; filename=%s" % filename
    )

    return Response(
        buf.getvalue(),
        content_type=b"%s" % str(content_type),
        content_disposition=content_disposition,
    )


def mvt(request):
    z = int(request.GET["z"])
    x = int(request.GET["x"])
    y = int(request.GET["y"])

    extent = int(request.GET.get('extent', 4096))
    simplification = float(request.GET.get("simplification", extent / 512))

    resids = map(
        int,
        filter(None, request.GET["resource"].split(",")),
    )

    # web mercator
    merc = SRS.filter_by(id=3857).one()
    minx, miny, maxx, maxy = merc.tile_extent((z, x, y))

    # 5% padding by default
    padding = float(request.GET.get("padding", 0.05))

    bbox = (
        minx - (maxx - minx) * padding,
        miny - (maxy - miny) * padding,
        maxx + (maxx - minx) * padding,
        maxy + (maxy - miny) * padding,
    )
    bbox = box(*bbox, srid=merc.id)

    options = [
        "FORMAT=DIRECTORY",
        "TILE_EXTENSION=pbf",
        "MINZOOM=%d" % z,
        "MAXZOOM=%d" % z,
        "EXTENT=%d" % extent,
        "COMPRESS=NO",
    ]

    ds = _ogr_ds(b"MVT", options)

    vsibuf = ds.GetName()

    for resid in resids:
        obj = Resource.filter_by(id=resid).one()
        request.resource_permission(PERM_READ, obj)

        query = obj.feature_query()
        query.intersects(bbox)
        query.geom()

        if IFeatureQueryClipByBox.providedBy(query):
            query.clip_by_box(bbox)

        if IFeatureQuerySimplify.providedBy(query):
            tolerance = ((obj.srs.maxx - obj.srs.minx) / (1 << z)) / extent
            query.simplify(tolerance * simplification)

        _ogr_layer_from_features(
            obj, query(), name=b"ngw:%d" % obj.id, ds=ds)

    # flush changes
    ds = None

    filepath = os.path.join(
        "%s" % vsibuf, "%d" % z, "%d" % x, "%d.pbf" % y
    )

    try:
        f = gdal.VSIFOpenL(b"%s" % (filepath,), b"rb")

        if f is not None:
            # SEEK_END = 2
            gdal.VSIFSeekL(f, 0, 2)
            size = gdal.VSIFTellL(f)

            # SEEK_SET = 0
            gdal.VSIFSeekL(f, 0, 0)
            content = gdal.VSIFReadL(1, size, f)
            gdal.VSIFCloseL(f)

            return Response(
                content,
                content_type=b"application/vnd.mapbox-vector-tile",
            )
        else:
            return HTTPNoContent()

    finally:
        gdal.Unlink(b"%s" % (vsibuf,))


def deserialize(feat, data):
    if 'geom' in data:
        feat.geom = geom_from_wkt(data['geom'])

    if 'fields' in data:
        fdata = data['fields']

        for fld in feat.layer.fields:

            if fld.keyname in fdata:
                val = fdata.get(fld.keyname)

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


def serialize(feat, keys=None, geom_format=None):
    result = OrderedDict(id=feat.id)

    if geom_format is not None and geom_format.lower() == "geojson":
        geom = mapping(feat.geom)
    else:
        geom = wkt.dumps(feat.geom)

    result['geom'] = geom

    result['fields'] = OrderedDict()
    for fld in feat.layer.fields:
        if keys is not None and fld.keyname not in keys:
            continue

        val = feat.fields.get(fld.keyname)

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


def query_feature_or_not_found(query, resource_id, feature_id):
    """ Query one feature by id or return FeatureNotFound exception. """

    query.filter_by(id=feature_id)
    query.limit(1)

    for feat in query():
        return feat

    raise FeatureNotFound(resource_id, feature_id)


def iget(resource, request):
    request.resource_permission(PERM_READ)

    geom_format = request.GET.get("geom_format")
    srs = request.GET.get("srs")

    query = resource.feature_query()
    query.geom()

    if srs is not None:
        query.srs(SRS.filter_by(id=int(srs)).one())

    result = query_feature_or_not_found(query, resource.id, int(request.matchdict['fid']))

    return Response(
        json.dumps(serialize(result, geom_format=geom_format), cls=geojson.Encoder),
        content_type='application/json', charset='utf-8')


def iput(resource, request):
    request.resource_permission(PERM_WRITE)

    query = resource.feature_query()
    query.geom()

    feature = query_feature_or_not_found(query, resource.id, int(request.matchdict['fid']))

    deserialize(feature, request.json_body)
    if IWritableFeatureLayer.providedBy(resource):
        resource.feature_put(feature)

    return Response(
        json.dumps(dict(id=feature.id)),
        content_type='application/json', charset='utf-8')


def idelete(resource, request):
    request.resource_permission(PERM_WRITE)

    fid = int(request.matchdict['fid'])
    resource.feature_delete(fid)

    return Response(json.dumps(None), content_type='application/json', charset='utf-8')


def cget(resource, request):
    request.resource_permission(PERM_READ)

    geom_format = request.GET.get("geom_format")
    srs = request.GET.get("srs")

    query = resource.feature_query()

    if srs is not None:
        query.srs(SRS.filter_by(id=int(srs)).one())

    # Paging
    limit = request.GET.get('limit')
    offset = request.GET.get('offset', 0)
    if limit is not None:
        query.limit(int(limit), int(offset))

    # Filtering by attributes
    filter_ = []
    keys = [fld.keyname for fld in resource.fields]
    for key in filter(lambda k: k.startswith('fld_'), request.GET.keys()):
        try:
            fld_key, operator = key.rsplit('__', 1)
        except ValueError:
            fld_key, operator = (key, 'eq')

        if fld_key in ['fld_%s' % k for k in keys]:
            filter_.append((re.sub('^fld_', '', fld_key), operator, request.GET[key]))

    if filter_:
        query.filter(*filter_)

    # Filtering by extent
    wkt = request.GET.get('intersects')
    if wkt is not None:
        geom = geom_from_wkt(wkt, srid=resource.srs.id)
        query.intersects(geom)

    # Selected fields
    fields = request.GET.get('fields')
    if fields is not None:
        field_list = fields.split(',')
        fields = [key for key in keys if key in field_list]

    if fields:
        query.fields(*fields)

    query.geom()

    result = [
        serialize(feature, fields, geom_format=geom_format)
        for feature in query()
    ]

    return Response(
        json.dumps(result, cls=geojson.Encoder),
        content_type='application/json', charset='utf-8')


def cpost(resource, request):
    request.resource_permission(PERM_WRITE)

    feature = Feature(layer=resource)
    deserialize(feature, request.json_body)
    fid = resource.feature_create(feature)

    return Response(
        json.dumps(dict(id=fid)),
        content_type='application/json', charset='utf-8')


def cpatch(resource, request):
    request.resource_permission(PERM_WRITE)
    result = list()

    for fdata in request.json_body:
        if 'id' not in fdata:
            # Create new feature
            feature = Feature(layer=resource)
            deserialize(feature, fdata)
            fid = resource.feature_create(feature)
        else:
            # Update existing feature
            fid = fdata['id']
            query = resource.feature_query()
            query.geom()
            query.filter_by(id=fid)
            query.limit(1)

            feature = None
            for f in query():
                feature = f

            deserialize(feature, fdata)
            resource.feature_put(feature)

        result.append(dict(id=fid))

    return Response(json.dumps(result), content_type='application/json', charset='utf-8')


def cdelete(resource, request):
    request.resource_permission(PERM_WRITE)

    if request.body and request.json_body:
        result = []
        for fdata in request.json_body:
            if 'id' in fdata:
                fid = fdata['id']
                resource.feature_delete(fid)
                result.append(fid)
    else:
        resource.feature_delete_all()
        result = True

    return Response(json.dumps(result), content_type='application/json', charset='utf-8')


def count(resource, request):
    request.resource_permission(PERM_READ)

    query = resource.feature_query()
    total_count = query().total_count

    return Response(
        json.dumps(dict(total_count=total_count)),
        content_type='application/json', charset='utf-8')


def store_collection(layer, request):
    request.resource_permission(PERM_READ)

    query = layer.feature_query()

    http_range = request.headers.get('range')
    if http_range and http_range.startswith('items='):
        first, last = map(int, http_range[len('items='):].split('-', 1))
        query.limit(last - first + 1, first)

    field_prefix = json.loads(
        unquote(request.headers.get('x-field-prefix', '""')))
    pref = lambda f: field_prefix + f  # NOQA: E731

    field_list = json.loads(
        unquote(request.headers.get('x-field-list', "[]")))
    if len(field_list) > 0:
        query.fields(*field_list)

    box = request.headers.get('x-feature-box')
    if box:
        query.box()

    like = request.params.get('like', '')
    if like != '':
        query.like(like)

    sort_re = re.compile(r'sort\(([+-])%s(\w+)\)' % (field_prefix, ))
    sort = sort_re.search(unquote(request.query_string))
    if sort:
        sort_order = {'+': 'asc', '-': 'desc'}[sort.group(1)]
        sort_colname = sort.group(2)
        query.order_by((sort_order, sort_colname), )

    features = query()

    result = []
    for fobj in features:
        fdata = dict(
            [(pref(k), v) for k, v in fobj.fields.items()],
            id=fobj.id, label=fobj.label)
        if box:
            fdata['box'] = fobj.box.bounds

        result.append(fdata)

    headers = dict()
    headers[str('Content-Type')] = str('application/json')

    if http_range:
        total = features.total_count
        last = min(total - 1, last)
        headers[str('Content-Range')] = str('items %d-%s/%d' % (first, last, total))

    return Response(json.dumps(result, cls=geojson.Encoder), headers=headers)


def setup_pyramid(comp, config):
    config.add_route(
        'feature_layer.geojson', '/api/resource/{id}/geojson',
        factory=resource_factory) \
        .add_view(view_geojson, context=IFeatureLayer, request_method='GET')

    config.add_route(
        'feature_layer.export', '/api/resource/{id}/export',
        factory=resource_factory) \
        .add_view(export, context=IFeatureLayer, request_method='GET')

    config.add_route(
        'feature_layer.mvt', '/api/component/feature_layer/mvt') \
        .add_view(mvt, request_method='GET')

    config.add_route(
        'feature_layer.feature.item', '/api/resource/{id}/feature/{fid}',
        factory=resource_factory) \
        .add_view(iget, context=IFeatureLayer, request_method='GET') \
        .add_view(iput, context=IFeatureLayer, request_method='PUT') \
        .add_view(idelete, context=IWritableFeatureLayer,
                  request_method='DELETE')

    config.add_route(
        'feature_layer.feature.collection', '/api/resource/{id}/feature/',
        factory=resource_factory) \
        .add_view(cget, context=IFeatureLayer, request_method='GET') \
        .add_view(cpost, context=IWritableFeatureLayer, request_method='POST') \
        .add_view(cpatch, context=IWritableFeatureLayer, request_method='PATCH') \
        .add_view(cdelete, context=IWritableFeatureLayer, request_method='DELETE')

    config.add_route(
        'feature_layer.feature.count', '/api/resource/{id}/feature_count',
        factory=resource_factory) \
        .add_view(count, context=IFeatureLayer, request_method='GET')

    config.add_route(
        'feature_layer.store', r'/api/resource/{id:\d+}/store/',
        factory=resource_factory) \
        .add_view(store_collection, context=IFeatureLayer, request_method='GET')

    from .identify import identify
    config.add_route(
        'feature_layer.identify', '/api/feature_layer/identify') \
        .add_view(identify, request_method='POST')
