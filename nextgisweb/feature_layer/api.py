# -*- coding: utf-8 -*-
from __future__ import division, absolute_import, print_function, unicode_literals
import json
import os
import re
import uuid
import zipfile
import itertools
from six import ensure_str
from six.moves.urllib.parse import unquote

import tempfile
import backports.tempfile
from collections import OrderedDict
from datetime import datetime, date, time

from osgeo import ogr, gdal
from pyproj import CRS
from pyramid.response import Response, FileResponse
from pyramid.httpexceptions import HTTPNoContent
from sqlalchemy.orm.exc import NoResultFound

from ..geometry import (
    geom_from_geojson, geom_to_geojson,
    geom_from_wkt, geom_to_wkt,
    geom_transform, box,
)
from ..resource import DataScope, ValidationError, Resource, resource_factory
from ..resource.exception import ResourceNotFound
from ..spatial_ref_sys import SRS
from .. import geojson

from .interface import (
    IFeatureLayer,
    IFeatureQueryLike,
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
    return gdal.GetDriverByName(ensure_str('Memory')).Create(
        ensure_str(''), 0, 0, 0, gdal.GDT_Unknown)


def _ogr_ds(driver, options):
    return ogr.GetDriverByName(driver).CreateDataSource(
        "/vsimem/%s" % uuid.uuid4(), options=options
    )


def _ogr_layer_from_features(layer, features, name='', ds=None, fid=None):
    ogr_layer = layer.to_ogr(ds, name=name, fid=fid)
    layer_defn = ogr_layer.GetLayerDefn()

    for f in features:
        ogr_layer.CreateFeature(
            f.to_ogr(layer_defn, fid=fid))

    return ogr_layer


def _extensions(extensions, layer):
    result = []

    ext_filter = None if extensions is None else extensions.split(',')

    for cls in FeatureExtension.registry:
        if ext_filter is None or cls.identity in ext_filter:
            result.append((cls.identity, cls(layer)))

    return result


def view_geojson(request):
    request.GET["format"] = "GeoJSON"
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
    ogr_layer = _ogr_layer_from_features(  # NOQA: 841
        request.context, query(), ds=ogr_ds, fid=fid)

    with backports.tempfile.TemporaryDirectory() as tmp_dir:
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
            os.path.join(tmp_dir, filename), ogr_ds,
            options=gdal.VectorTranslateOptions(options=vtopts)
        )

        if zipped or not driver.single_file:
            content_type = "application/zip"
            content_disposition = "attachment; filename=%s" % ("%s.zip" % (filename,))
            with tempfile.NamedTemporaryFile(suffix=".zip") as tmp_file:
                with zipfile.ZipFile(tmp_file, "w", zipfile.ZIP_DEFLATED) as zipf:
                    for root, dirs, files in os.walk(tmp_dir):
                        for file in files:
                            path = os.path.join(root, file)
                            zipf.write(path, os.path.basename(path))
                response = FileResponse(tmp_file.name, content_type=content_type)
                response.content_disposition = content_disposition
                return response
        else:
            content_type = driver.mime or "application/octet-stream"
            content_disposition = "attachment; filename=%s" % filename
            response = FileResponse(
                os.path.join(tmp_dir, filename), content_type=content_type
            )
            response.content_disposition = content_disposition
            return response


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
        try:
            obj = Resource.filter_by(id=resid).one()
        except NoResultFound:
            raise ResourceNotFound(resid)

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
                content_type="application/vnd.mapbox-vector-tile",
            )
        else:
            return HTTPNoContent()

    finally:
        gdal.Unlink(b"%s" % (vsibuf,))


def get_transformer(srs_from_id, srs_to_id):
    if srs_from_id is None or srs_to_id is None or srs_from_id == srs_to_id:
        return None

    srs_from = SRS.filter_by(id=int(srs_from_id)).one()
    srs_to = SRS.filter_by(id=int(srs_to_id)).one()
    crs_from = CRS.from_wkt(srs_from.wkt)
    crs_to = CRS.from_wkt(srs_to.wkt)

    return lambda g: geom_transform(g, crs_from, crs_to)


def deserialize(feat, data, geom_format='wkt', transformer=None):
    if 'geom' in data:
        if geom_format == 'wkt':
            feat.geom = geom_from_wkt(data['geom'])
        elif geom_format == 'geojson':
            feat.geom = geom_from_geojson(data['geom'])
        else:
            raise ValidationError(_("Geometry format '%s' is not supported.") % geom_format)

        if transformer is not None:
            feat.geom = transformer(feat.geom)

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


def serialize(feat, keys=None, geom_format='wkt', extensions=[]):
    result = OrderedDict(id=feat.id)

    if feat.geom is not None:
        if geom_format == 'wkt':
            geom = geom_to_wkt(feat.geom)
        elif geom_format == 'geojson':
            geom = geom_to_geojson(feat.geom)
        else:
            raise ValidationError(_("Geometry format '%s' is not supported.") % geom_format)

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
    for identity, ext in extensions:
        result['extensions'][identity] = ext.serialize(feat)

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

    geom_skip = request.GET.get("geom", 'yes').lower() == 'no'
    geom_format = request.GET.get("geom_format", 'wkt').lower()
    srs = request.GET.get("srs")
    extensions = _extensions(request.GET.get("extensions"), resource)

    query = resource.feature_query()
    if not geom_skip:
        if srs is not None:
            query.srs(SRS.filter_by(id=int(srs)).one())
        query.geom()

    feature = query_feature_or_not_found(query, resource.id, int(request.matchdict['fid']))

    result = serialize(feature, geom_format=geom_format, extensions=extensions)

    return Response(
        json.dumps(result, cls=geojson.Encoder),
        content_type='application/json', charset='utf-8')


def item_extent(resource, request):
    request.resource_permission(PERM_READ)

    feature_id = int(request.matchdict['fid'])
    query = resource.feature_query()
    query.srs(SRS.filter_by(id=4326).one())
    query.box()

    feature = query_feature_or_not_found(query, resource.id, feature_id)
    minLon, minLat, maxLon, maxLat = feature.box.bounds
    extent = dict(
        minLon=minLon,
        minLat=minLat,
        maxLon=maxLon,
        maxLat=maxLat
    )
    return Response(
        json.dumps(dict(extent=extent)),
        content_type='application/json', charset='utf-8')


def iput(resource, request):
    request.resource_permission(PERM_WRITE)

    query = resource.feature_query()
    query.geom()

    feature = query_feature_or_not_found(query, resource.id, int(request.matchdict['fid']))

    geom_format = request.GET.get('geom_format', 'wkt').lower()
    srs = request.GET.get('srs')
    transformer = get_transformer(srs, resource.srs_id)

    deserialize(feature, request.json_body, geom_format=geom_format, transformer=transformer)
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

    geom_skip = request.GET.get("geom", 'yes') == 'no'
    geom_format = request.GET.get("geom_format", 'wkt').lower()
    srs = request.GET.get("srs")
    extensions = _extensions(request.GET.get("extensions"), resource)

    query = resource.feature_query()

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

    # Like
    like = request.GET.get('like')
    if like is not None and IFeatureQueryLike.providedBy(query):
        query.like(like)

    # Ordering
    order_by = request.GET.get('order_by')
    order_by_ = []
    if order_by is not None:
        for order_def in list(order_by.split(',')):
            order, colname = re.match(r'^(\-|\+|%2B)?(.*)$', order_def).groups()
            if colname is not None:
                order = ['asc', 'desc'][order == '-']
                order_by_.append([order, colname])

    if order_by_:
        query.order_by(*order_by_)

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

    if not geom_skip:
        if srs is not None:
            query.srs(SRS.filter_by(id=int(srs)).one())
        query.geom()

    result = [
        serialize(feature, fields, geom_format=geom_format, extensions=extensions)
        for feature in query()
    ]

    return Response(
        json.dumps(result, cls=geojson.Encoder),
        content_type='application/json', charset='utf-8')


def cpost(resource, request):
    request.resource_permission(PERM_WRITE)

    geom_format = request.GET.get('geom_format', 'wkt').lower()
    srs = request.GET.get('srs')
    transformer = get_transformer(srs, resource.srs_id)

    feature = Feature(layer=resource)
    deserialize(feature, request.json_body, geom_format=geom_format, transformer=transformer)
    fid = resource.feature_create(feature)

    return Response(
        json.dumps(dict(id=fid)),
        content_type='application/json', charset='utf-8')


def cpatch(resource, request):
    request.resource_permission(PERM_WRITE)
    result = list()

    geom_format = request.GET.get('geom_format', 'wkt').lower()
    srs = request.GET.get('srs')
    transformer = get_transformer(srs, resource.srs_id)

    for fdata in request.json_body:
        if 'id' not in fdata:
            # Create new feature
            feature = Feature(layer=resource)
            deserialize(feature, fdata, geom_format=geom_format, transformer=transformer)
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

            deserialize(feature, fdata, geom_format=geom_format, transformer=transformer)
            resource.feature_put(feature)

        result.append(dict(id=fid))

    return Response(json.dumps(result), content_type='application/json', charset='utf-8')


def cdelete(resource, request):
    request.resource_permission(PERM_WRITE)

    if len(request.body) > 0:
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

    def pref(f):
        return field_prefix + f

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

    config.add_view(
        export,
        route_name='resource.export',
        context=IFeatureLayer,
        request_method='GET',
    )

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
        'feature_layer.feature.item_extent', '/api/resource/{id}/feature/{fid}/extent',
        factory=resource_factory) \
        .add_view(item_extent, context=IFeatureLayer, request_method='GET')

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
