import itertools
import json
import os
import re
import tempfile
import uuid
import zipfile
from datetime import date, datetime, time
from urllib.parse import unquote

from osgeo import gdal, ogr
from pyramid.httpexceptions import HTTPNoContent, HTTPNotFound
from pyramid.response import FileResponse, Response
from shapely.geometry import box
from sqlalchemy.orm.exc import NoResultFound

from nextgisweb.env import _, env
from nextgisweb.lib.geometry import Geometry, GeometryNotValid, Transformer, geom_area, geom_length

from nextgisweb.core.exception import ValidationError
from nextgisweb.pyramid import JSONType
from nextgisweb.render.util import zxy_from_request
from nextgisweb.resource import DataScope, Resource, resource_factory
from nextgisweb.resource.exception import ResourceNotFound
from nextgisweb.spatial_ref_sys import SRS

from .exception import FeatureNotFound
from .extension import FeatureExtension
from .feature import Feature
from .interface import (
    FIELD_TYPE,
    IFeatureLayer,
    IFeatureQueryClipByBox,
    IFeatureQueryIlike,
    IFeatureQueryLike,
    IFeatureQuerySimplify,
    IWritableFeatureLayer,
)
from .ogrdriver import EXPORT_FORMAT_OGR, MVT_DRIVER_EXIST

PERM_READ = DataScope.read
PERM_WRITE = DataScope.write


def _ogr_memory_ds():
    return gdal.GetDriverByName('Memory').Create(
        '', 0, 0, 0, gdal.GDT_Unknown)


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

    for identity, cls in FeatureExtension.registry.items():
        if ext_filter is None or identity in ext_filter:
            result.append((identity, cls(layer)))

    return result


class ExportOptions:
    __slots__ = (
        'driver', 'dsco', 'lco', 'srs', 'intersects_geom', 'intersects_srs',
        'fields', 'fid_field', 'use_display_name', 'ilike',
    )

    def __init__(
        self, *, format=None, encoding=None, srs=None,
        intersects=None, intersects_srs=None, ilike=None,
        fields=None, fid='', display_name='false', **params,
    ):
        if format is None:
            raise ValidationError(message=_("Output format is not provided."))
        if format not in EXPORT_FORMAT_OGR:
            raise ValidationError(message=_("Format '%s' is not supported.") % format)
        self.driver = EXPORT_FORMAT_OGR[format]

        # dataset creation options (configurable by user)
        self.dsco = list()
        if self.driver.dsco_configurable is not None:
            for option in self.driver.dsco_configurable:
                option = option.split(':')[0]
                if option in params:
                    self.dsco.append(f'{option}={params[option]}')

        # layer creation options
        self.lco = []
        if self.driver.options is not None:
            self.lco.extend(self.driver.options)
        if encoding is not None:
            self.lco.append(f'ENCODING={encoding}')

        # KML should be created as WGS84
        if self.driver.name == 'LIBKML':
            self.srs = SRS.filter_by(id=4326).one()
        elif srs is not None:
            self.srs = SRS.filter_by(id=srs).one()
        else:
            self.srs = None

        if intersects is not None:
            try:
                self.intersects_geom = Geometry.from_wkt(intersects)
            except GeometryNotValid:
                raise ValidationError(message=_("Parameter 'intersects' geometry is not valid."))

            if intersects_srs is not None:
                self.intersects_srs = SRS.filter_by(id=intersects_srs).one()
            else:
                self.intersects_srs = None
        else:
            self.intersects_geom = self.intersects_srs = None

        self.ilike = ilike

        self.fields = fields.split(',') if fields is not None else None
        self.fid_field = fid if fid != '' else None

        self.use_display_name = display_name.lower() == 'true'


def export(resource, options, filepath):
    query = resource.feature_query()

    if (export_limit := env.feature_layer.export_limit) is not None:
        total_count = query().total_count

        if total_count > export_limit:
            raise ValidationError(
                message=_(
                    "The export limit is set to {limit} features, but the layer contains {count}."
                ).format(limit=export_limit, count=total_count)
            )

    query.geom()

    if options.intersects_geom is not None:
        if options.intersects_srs is not None and options.intersects_srs.id != resource.srs_id:
            transformer = Transformer(options.intersects_srs.wkt, resource.srs.wkt)
            try:
                intersects_geom = transformer.transform(options.intersects_geom)
            except ValueError:
                raise ValidationError(message=_(
                    "Failed to reproject 'intersects' geometry."))
        else:
            intersects_geom = options.intersects_geom
        query.intersects(intersects_geom)

    if options.ilike is not None and IFeatureQueryIlike.providedBy(query):
        query.ilike(options.ilike)

    ogr_ds = _ogr_memory_ds()
    ogr_layer = _ogr_layer_from_features(  # NOQA: 841
        resource, query(), ds=ogr_ds, fid=options.fid_field)

    driver = options.driver
    srs = options.srs if options.srs is not None else resource.srs
    vtopts = (
        [
            '-f', driver.name,
            '-t_srs', srs.wkt,
        ]
        + list(itertools.chain(*[('-lco', o) for o in options.lco]))
        + list(itertools.chain(*[('-dsco', o) for o in options.dsco]))
    )

    # CPLES_SQLI == 7
    flds = [
        '"{}" as "{}"'.format(
            fld.keyname.replace('"', r'\"'),
            (fld.display_name if options.use_display_name else fld.keyname).replace(
                '"', r'\"'
            ),
        )
        for fld in resource.fields
        if options.fields is None or fld.keyname in options.fields
    ]
    if options.fid_field is not None:
        flds += ['FID as "{}"'.format(options.fid_field.replace('"', r'\"'))]
    vtopts += ['-sql', 'select {} from ""'.format(', '.join(
        flds if len(flds) > 0 else '*'))]

    if driver.fid_support and options.fid_field is None:
        vtopts.append('-preserve_fid')

    gdal.VectorTranslate(
        filepath, ogr_ds,
        options=gdal.VectorTranslateOptions(options=vtopts)
    )


def _zip_response(request, directory, filename):
    with tempfile.NamedTemporaryFile(suffix='.zip') as tmp_file:
        with zipfile.ZipFile(tmp_file, 'w', zipfile.ZIP_DEFLATED) as zipf:
            for root, dirs, files in os.walk(directory):
                for file in files:
                    path = os.path.join(root, file)
                    zipf.write(path, os.path.relpath(path, directory))
        response = FileResponse(
            tmp_file.name,
            content_type='application/zip',
            request=request)
        response.content_disposition = f'attachment; filename={filename}.zip'
        return response


def export_single(resource, request):
    request.resource_permission(PERM_READ)

    params = dict(request.GET)
    for p in ('srs', 'intersects_srs'):
        if p in params:
            params[p] = int(params[p])
    options = ExportOptions(**params)

    with tempfile.TemporaryDirectory() as tmp_dir:
        filename = f'{resource.id}.{options.driver.extension}'
        filepath = os.path.join(tmp_dir, filename)

        export(resource, options, filepath)

        zipped = request.GET.get('zipped', 'true').lower() == 'true'
        if not options.driver.single_file or zipped:
            return _zip_response(request, tmp_dir, filename)
        else:
            response = FileResponse(
                filepath,
                content_type=options.driver.mime or 'application/octet-stream',
                request=request)
            response.content_disposition = f'attachment; filename={filename}'
            return response


def view_geojson(resource, request):
    request.resource_permission(PERM_READ)

    options = ExportOptions(format='GeoJSON')

    with tempfile.TemporaryDirectory() as tmp_dir:
        filename = f'{resource.id}.{options.driver.extension}'
        filepath = os.path.join(tmp_dir, filename)

        export(resource, options, filepath)

        response = FileResponse(
            filepath,
            content_type=options.driver.mime or 'application/octet-stream',
            request=request)
        response.content_disposition = f'attachment; filename={filename}'
        return response


def export_multi(request):
    if request.method == 'GET':
        params = dict(request.GET)
        for p in ('srs', 'intersects_srs'):
            if p in params:
                params[p] = int(params[p])

        params_resources = list()
        for p in params.pop('resources').split(','):
            splitted = p.split(':')
            param = dict(id=int(splitted[0]))
            for i, key in enumerate(('name', ), start=1):
                if len(splitted) <= i:
                    break
                param[key] = splitted[i]
            params_resources.append(param)
    else:
        params = request.json_body
        params_resources = params.pop('resources')
    options = ExportOptions(**params)

    with tempfile.TemporaryDirectory() as tmp_dir:
        for param in params_resources:
            try:
                resource = Resource.filter_by(id=param['id']).one()
            except NoResultFound:
                raise ResourceNotFound(param['id'])
            request.resource_permission(PERM_READ, resource)

            if 'name' in param:
                name = param['name']
                if name != os.path.basename(name):
                    raise ValidationError(
                        message=_("File name parameter '{}' is not valid.") % name)
            else:
                name = str(resource.id)

            if not options.driver.single_file:
                layer_dir = os.path.join(tmp_dir, name)
                os.mkdir(layer_dir)
            else:
                layer_dir = tmp_dir
            filepath = os.path.join(layer_dir, f'{name}.{options.driver.extension}')

            export(resource, options, filepath)

        return _zip_response(request, tmp_dir, 'layers')


def mvt(request):
    if not MVT_DRIVER_EXIST:
        return HTTPNotFound(explanation='MVT GDAL driver not found')

    z, x, y = zxy_from_request(request)

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
    bbox = Geometry.from_shape(box(*bbox), srid=merc.id)

    options = [
        "FORMAT=DIRECTORY",
        "TILE_EXTENSION=pbf",
        "MINZOOM=%d" % z,
        "MAXZOOM=%d" % z,
        "EXTENT=%d" % extent,
        "COMPRESS=NO",
    ]

    ds = _ogr_ds("MVT", options)

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
            obj, query(), name="ngw:%d" % obj.id, ds=ds)

    # flush changes
    ds = None

    filepath = os.path.join(
        "%s" % vsibuf, "%d" % z, "%d" % x, "%d.pbf" % y
    )

    try:
        f = gdal.VSIFOpenL(filepath, "rb")

        if f is not None:
            # SEEK_END = 2
            gdal.VSIFSeekL(f, 0, 2)
            size = gdal.VSIFTellL(f)

            # SEEK_SET = 0
            gdal.VSIFSeekL(f, 0, 0)
            content = bytes(gdal.VSIFReadL(1, size, f))
            gdal.VSIFCloseL(f)

            return Response(
                content,
                content_type="application/vnd.mapbox-vector-tile",
            )
        else:
            return HTTPNoContent()

    finally:
        gdal.Unlink(vsibuf)


def deserialize(feat, data, geom_format='wkt', dt_format='obj', transformer=None):
    if 'geom' in data:
        try:
            if geom_format == 'wkt':
                feat.geom = Geometry.from_wkt(data['geom'])
            elif geom_format == 'geojson':
                feat.geom = Geometry.from_geojson(data['geom'])
            else:
                raise ValidationError(_("Geometry format '%s' is not supported.") % geom_format)
        except GeometryNotValid:
            raise ValidationError(_("Geometry is not valid."))

        if transformer is not None:
            feat.geom = transformer.transform(feat.geom)

    if dt_format not in ('obj', 'iso'):
        raise ValidationError(_("Date format '%s' is not supported.") % dt_format)

    if 'fields' in data:
        fdata = data['fields']

        for fld in feat.layer.fields:

            if fld.keyname in fdata:
                val = fdata.get(fld.keyname)

                if val is None:
                    fval = None

                elif fld.datatype == FIELD_TYPE.DATE:
                    if dt_format == 'iso':
                        fval = date.fromisoformat(val)
                    else:
                        fval = date(
                            int(val['year']),
                            int(val['month']),
                            int(val['day']))

                elif fld.datatype == FIELD_TYPE.TIME:
                    if dt_format == 'iso':
                        fval = time.fromisoformat(val)
                    else:
                        fval = time(
                            int(val['hour']),
                            int(val['minute']),
                            int(val['second']))

                elif fld.datatype == FIELD_TYPE.DATETIME:
                    if dt_format == 'iso':
                        fval = datetime.fromisoformat(val)
                    else:
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
        for identity, cls in FeatureExtension.registry.items():
            if identity in data['extensions']:
                ext = cls(feat.layer)
                ext.deserialize(feat, data['extensions'][identity])


def serialize(feat, keys=None, geom_format='wkt', dt_format='obj', label=False, extensions=[]):
    result = dict(id=feat.id)

    if label:
        result['label'] = feat.label

    if feat.geom is not None:
        if geom_format == 'wkt':
            geom = feat.geom.wkt
        elif geom_format == 'geojson':
            geom = feat.geom.to_geojson()
        else:
            raise ValidationError(_("Geometry format '%s' is not supported.") % geom_format)

        result['geom'] = geom

    if dt_format not in ('obj', 'iso'):
        raise ValidationError(_("Date format '%s' is not supported.") % dt_format)

    result['fields'] = dict()
    for fld in feat.layer.fields:
        if keys is not None and fld.keyname not in keys:
            continue

        val = feat.fields.get(fld.keyname)

        if val is None:
            fval = None

        elif fld.datatype in (FIELD_TYPE.DATE, FIELD_TYPE.TIME, FIELD_TYPE.DATETIME):
            if dt_format == 'iso':
                fval = val.isoformat()
            else:
                if fld.datatype == FIELD_TYPE.DATE:
                    fval = dict((
                        ('year', val.year),
                        ('month', val.month),
                        ('day', val.day)))

                elif fld.datatype == FIELD_TYPE.TIME:
                    fval = dict((
                        ('hour', val.hour),
                        ('minute', val.minute),
                        ('second', val.second)))

                elif fld.datatype == FIELD_TYPE.DATETIME:
                    fval = dict((
                        ('year', val.year),
                        ('month', val.month),
                        ('day', val.day),
                        ('hour', val.hour),
                        ('minute', val.minute),
                        ('second', val.second)))

        else:
            fval = val

        result['fields'][fld.keyname] = fval

    result['extensions'] = dict()
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


def iget(resource, request) -> JSONType:
    request.resource_permission(PERM_READ)

    geom_skip = request.GET.get("geom", 'yes').lower() == 'no'
    srs = request.GET.get("srs")

    srlz_params = dict(
        geom_format=request.GET.get('geom_format', 'wkt').lower(),
        dt_format=request.GET.get('dt_format', 'obj'),
        extensions=_extensions(request.GET.get('extensions'), resource)
    )

    query = resource.feature_query()
    if not geom_skip:
        if srs is not None:
            query.srs(SRS.filter_by(id=int(srs)).one())
        query.geom()
        if srlz_params['geom_format'] == 'wkt':
            query.geom_format('WKT')

    feature = query_feature_or_not_found(query, resource.id, int(request.matchdict['fid']))

    result = serialize(feature, **srlz_params)

    return result


def item_extent(resource, request) -> JSONType:
    request.resource_permission(PERM_READ)
    feature_id = int(request.matchdict['fid'])
    extent = get_extent(resource, feature_id, 4326)
    return dict(extent=extent)


def get_box_bounds(resource, feature_id, srs_id):
    query = resource.feature_query()
    query.srs(SRS.filter_by(id=srs_id).one())
    query.box()

    feature = query_feature_or_not_found(query, resource.id, feature_id)
    return feature.box.bounds


def get_extent(resource, feature_id, srs):
    minLon, minLat, maxLon, maxLat = get_box_bounds(resource, feature_id, srs)
    return dict(
        minLon=minLon,
        minLat=minLat,
        maxLon=maxLon,
        maxLat=maxLat
    )


def geometry_info(resource, request) -> JSONType:
    request.resource_permission(PERM_READ)

    query = resource.feature_query()
    query.geom()
    query.geom_format('WKT')

    srs_param = request.GET.get("srs")
    srs_id = int(srs_param) if srs_param is not None else 3857
    try:
        srs = SRS.filter_by(id=srs_id).one()
    except NoResultFound:
        raise ValidationError(message=_('Unknown spatial reference system'),
                              data={"srs.id": srs_id})
    query.srs(srs)

    feature_id = int(request.matchdict['fid'])
    feature = query_feature_or_not_found(query, resource.id, feature_id)

    geom = feature.geom
    shape = geom.shape
    geom_type = shape.geom_type

    minX, minY, maxX, maxY = get_box_bounds(resource, feature_id, srs_id)
    extent = dict(
        minX=minX,
        minY=minY,
        maxX=maxX,
        maxY=maxY
    )

    area = abs(geom_area(geom, srs.wkt))
    length = abs(geom_length(geom, srs.wkt))

    if geom_type == 'Point':
        area = None
        length = None
    elif geom_type == 'LineString' or geom_type == 'LinearRing' or geom_type == 'MultiLineString':
        area = None

    return dict(
        type=geom_type,
        area=area,
        length=length,
        extent=extent
    )


def iput(resource, request) -> JSONType:
    request.resource_permission(PERM_WRITE)

    query = resource.feature_query()
    query.geom()

    feature = query_feature_or_not_found(query, resource.id, int(request.matchdict['fid']))

    dsrlz_params = dict(
        geom_format=request.GET.get('geom_format', 'wkt').lower(),
        dt_format=request.GET.get('dt_format', 'obj')
    )

    srs = request.GET.get('srs')

    if srs is not None:
        srs_from = SRS.filter_by(id=int(srs)).one()
        dsrlz_params['transformer'] = Transformer(srs_from.wkt, resource.srs.wkt)

    deserialize(feature, request.json_body, **dsrlz_params)
    if IWritableFeatureLayer.providedBy(resource):
        resource.feature_put(feature)

    return dict(id=feature.id)


def idelete(resource, request) -> JSONType:
    request.resource_permission(PERM_WRITE)

    fid = int(request.matchdict['fid'])
    resource.feature_delete(fid)


def apply_attr_filter(query, request, keynames):
    # Fields filters
    filter_ = []
    for param in request.GET.keys():
        if param.startswith('fld_'):
            fld_expr = re.sub('^fld_', '', param)
        elif param == 'id' or param.startswith('id__'):
            fld_expr = param
        else:
            continue

        try:
            key, operator = fld_expr.rsplit('__', 1)
        except ValueError:
            key, operator = (fld_expr, 'eq')

        if key != 'id' and key not in keynames:
            raise ValidationError(message="Unknown field '%s'." % key)

        filter_.append((key, operator, request.GET[param]))

    if len(filter_) > 0:
        query.filter(*filter_)

    if 'like' in request.GET and IFeatureQueryLike.providedBy(query):
        query.like(request.GET['like'])
    elif 'ilike' in request.GET and IFeatureQueryIlike.providedBy(query):
        query.ilike(request.GET['ilike'])


def apply_intersect_filter(query, request, resource):
    # Filtering by extent
    if 'intersects' in request.GET:
        wkt_intersects = request.GET['intersects']
    # Workaround to pass huge geometry for intersection filter
    elif (
        request.content_type == 'application/json'
        and 'intersects' in (json_body := request.json_body)
    ):
        wkt_intersects = json_body['intersects']
    else:
        wkt_intersects = None

    if wkt_intersects is not None:
        try:
            geom = Geometry.from_wkt(wkt_intersects, srid=resource.srs.id)
        except GeometryNotValid:
            raise ValidationError(_("Parameter 'intersects' geometry is not valid."))
        query.intersects(geom)


def cget(resource, request) -> JSONType:
    request.resource_permission(PERM_READ)

    geom_skip = request.GET.get("geom", 'yes') == 'no'
    srs = request.GET.get("srs")

    srlz_params = dict(
        geom_format=request.GET.get('geom_format', 'wkt').lower(),
        dt_format=request.GET.get('dt_format', 'obj'),
        label=request.GET.get('label', False),
        extensions=_extensions(request.GET.get('extensions'), resource),
    )

    keys = [fld.keyname for fld in resource.fields]
    query = resource.feature_query()

    # Paging
    limit = request.GET.get('limit')
    offset = request.GET.get('offset', 0)
    if limit is not None:
        query.limit(int(limit), int(offset))

    apply_attr_filter(query, request, keys)

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

    apply_intersect_filter(query, request, resource)

    # Selected fields
    fields = request.GET.get('fields')
    if fields is not None:
        field_list = fields.split(',')
        fields = [key for key in keys if key in field_list]

    if fields:
        srlz_params['keys'] = fields
        query.fields(*fields)

    if not geom_skip:
        if srs is not None:
            query.srs(SRS.filter_by(id=int(srs)).one())
        query.geom()
        if srlz_params['geom_format'] == 'wkt':
            query.geom_format('WKT')

    result = [
        serialize(feature, **srlz_params)
        for feature in query()
    ]

    return result


def cpost(resource, request) -> JSONType:
    request.resource_permission(PERM_WRITE)

    dsrlz_params = dict(
        geom_format=request.GET.get('geom_format', 'wkt').lower(),
        dt_format=request.GET.get('dt_format', 'obj')
    )

    srs = request.GET.get('srs')

    if srs is not None:
        srs_from = SRS.filter_by(id=int(srs)).one()
        dsrlz_params['transformer'] = Transformer(srs_from.wkt, resource.srs.wkt)

    feature = Feature(layer=resource)
    deserialize(feature, request.json_body, **dsrlz_params)
    fid = resource.feature_create(feature)

    return dict(id=fid)


def cpatch(resource, request) -> JSONType:
    request.resource_permission(PERM_WRITE)
    result = list()

    dsrlz_params = dict(
        geom_format=request.GET.get('geom_format', 'wkt').lower(),
        dt_format=request.GET.get('dt_format', 'obj')
    )

    srs = request.GET.get('srs')

    if srs is not None:
        srs_from = SRS.filter_by(id=int(srs)).one()
        dsrlz_params['transformer'] = Transformer(srs_from.wkt, resource.srs.wkt)

    for fdata in request.json_body:
        if 'id' not in fdata:
            # Create new feature
            feature = Feature(layer=resource)
            deserialize(feature, fdata, **dsrlz_params)
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

            deserialize(feature, fdata, **dsrlz_params)
            resource.feature_put(feature)

        result.append(dict(id=fid))

    return result


def cdelete(resource, request) -> JSONType:
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

    return result


def count(resource, request) -> JSONType:
    request.resource_permission(PERM_READ)

    query = resource.feature_query()
    total_count = query().total_count

    return dict(total_count=total_count)


def feature_extent(resource, request) -> JSONType:
    request.resource_permission(PERM_READ)

    supported_ident = ['vector_layer', 'postgis_layer']
    if resource.identity not in supported_ident:
        raise ValidationError('feature_layer.feature.extent can only be applied to vector and postgis layers')

    keys = [fld.keyname for fld in resource.fields]
    query = resource.feature_query()

    apply_attr_filter(query, request, keys)
    apply_intersect_filter(query, request, resource)

    extent = query().extent
    return dict(extent=extent)


def store_collection(resource, request) -> JSONType:
    request.resource_permission(PERM_READ)

    query = resource.feature_query()

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

    if http_range:
        total = features.total_count
        last = min(total - 1, last)
        content_range = 'items %d-%d/%d' % (first, last, total)
        request.response.headers['Content-Range'] = content_range

    return result


def setup_pyramid(comp, config):
    config.add_route(
        'feature_layer.geojson',
        '/api/resource/{id:uint}/geojson',
        factory=resource_factory,
    ).get(view_geojson, context=IFeatureLayer)

    config.add_view(
        export_single,
        route_name='resource.export',
        context=IFeatureLayer,
        request_method='GET',
    )

    config.add_route(
        'feature_layer.export', '/api/component/feature_layer/export'
    ).add_view(export_multi, request_method=('POST', 'GET'))

    config.add_route(
        'feature_layer.mvt',
        '/api/component/feature_layer/mvt',
        get=mvt)

    config.add_route(
        'feature_layer.feature.item',
        '/api/resource/{id:uint}/feature/{fid:int}',
        factory=resource_factory
    ) \
        .get(iget, context=IFeatureLayer) \
        .put(iput, context=IFeatureLayer) \
        .delete(idelete, context=IWritableFeatureLayer)

    config.add_route(
        'feature_layer.feature.item_extent',
        '/api/resource/{id:uint}/feature/{fid:int}/extent',
        factory=resource_factory,
    ).get(item_extent, context=IFeatureLayer)

    config.add_route(
        'feature_layer.feature.geometry_info',
        '/api/resource/{id:uint}/feature/{fid:int}/geometry_info',
        factory=resource_factory
    ).get(geometry_info, context=IFeatureLayer)

    config.add_route(
        'feature_layer.feature.collection',
        '/api/resource/{id:uint}/feature/',
        factory=resource_factory,
    ) \
        .get(cget, context=IFeatureLayer) \
        .post(cpost, context=IWritableFeatureLayer) \
        .patch(cpatch, context=IWritableFeatureLayer) \
        .delete(cdelete, context=IWritableFeatureLayer)

    config.add_route(
        'feature_layer.feature.count',
        '/api/resource/{id:uint}/feature_count',
        factory=resource_factory,
    ).get(count, context=IFeatureLayer)

    config.add_route(
        'feature_layer.feature.extent',
        '/api/resource/{id:uint}/feature_extent',
        factory=resource_factory,
    ).get(feature_extent, context=IFeatureLayer)

    config.add_route(
        'feature_layer.store',
        '/api/resource/{id:uint}/store/',
        factory=resource_factory,
        deprecated=True,
    ).get(store_collection, context=IFeatureLayer)

    from .identify import identify

    config.add_route(
        'feature_layer.identify',
        '/api/feature_layer/identify',
        post=identify)
