import os
import re
import tempfile
import uuid
import zipfile
from contextlib import contextmanager
from dataclasses import dataclass
from enum import Enum
from functools import cached_property, partial
from typing import Any, List, Optional

from msgspec import UNSET, Meta
from osgeo import gdal, ogr
from pyramid.httpexceptions import HTTPNoContent, HTTPNotFound
from pyramid.response import FileResponse, Response
from shapely.geometry import box
from sqlalchemy.orm.exc import NoResultFound
from typing_extensions import Annotated

from nextgisweb.env import _, env
from nextgisweb.lib.apitype import AnyOf, ContentType, StatusCode
from nextgisweb.lib.geometry import Geometry, GeometryNotValid, Transformer, geom_area, geom_length

from nextgisweb.core.exception import ValidationError
from nextgisweb.pyramid import JSONType
from nextgisweb.resource import DataScope, Resource, ResourceFactory
from nextgisweb.resource.exception import ResourceNotFound
from nextgisweb.spatial_ref_sys import SRS

from .dtutil import DT_DATATYPES, DT_DUMPERS, DT_LOADERS
from .exception import FeatureNotFound
from .extension import FeatureExtension
from .feature import Feature
from .interface import (
    IFeatureLayer,
    IFeatureQueryClipByBox,
    IFeatureQueryIlike,
    IFeatureQueryLike,
    IFeatureQuerySimplify,
    IVersionableFeatureLayer,
    IWritableFeatureLayer,
)
from .ogrdriver import EXPORT_FORMAT_OGR, MVT_DRIVER_EXIST
from .versioning import FVersioningNotEnabled, FVersioningOutOfRange

PERM_READ = DataScope.read
PERM_WRITE = DataScope.write

FeatureID = Annotated[int, Meta(description="Feature ID")]


def _ogr_memory_ds():
    return gdal.GetDriverByName("Memory").Create("", 0, 0, 0, gdal.GDT_Unknown)


def _ogr_ds(driver, options):
    return ogr.GetDriverByName(driver).CreateDataSource(
        "/vsimem/%s" % uuid.uuid4(), options=options
    )


def _ogr_layer_from_features(
    layer,
    features,
    *,
    ds,
    name="",
    fields=None,
    use_display_name=False,
    fid=None,
):
    layer_fields = (
        layer.fields
        if fields is None
        else sorted(
            (field for field in layer.fields if field.keyname in fields),
            key=lambda field: fields.index(field.keyname),
        )
    )
    ogr_layer = layer.to_ogr(
        ds, name=name, fields=layer_fields, use_display_name=use_display_name, fid=fid
    )
    layer_defn = ogr_layer.GetLayerDefn()

    f_kw = dict()
    if fid is not None:
        f_kw["fid"] = fid
    if use_display_name:
        f_kw["aliases"] = {field.keyname: field.display_name for field in layer_fields}

    for f in features:
        ogr_layer.CreateFeature(f.to_ogr(layer_defn, **f_kw))

    return ogr_layer


class ExportOptions:
    __slots__ = (
        "driver",
        "dsco",
        "lco",
        "srs",
        "intersects_geom",
        "intersects_srs",
        "fields",
        "fid_field",
        "use_display_name",
        "ilike",
    )

    def __init__(
        self,
        *,
        format=None,
        encoding=None,
        srs=None,
        intersects=None,
        intersects_srs=None,
        ilike=None,
        fields=None,
        fid="",
        display_name="false",
        **params,
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
                option = option.split(":")[0]
                if option in params:
                    self.dsco.append(f"{option}={params[option]}")

        # layer creation options
        self.lco = []
        if self.driver.options is not None:
            self.lco.extend(self.driver.options)
        if encoding is not None:
            self.lco.append(f"ENCODING={encoding}")

        # KML should be created as WGS84
        if self.driver.name == "LIBKML":
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

        self.fields = fields.split(",") if fields is not None else None
        self.fid_field = fid if fid != "" else None

        self.use_display_name = display_name.lower() == "true"


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
                raise ValidationError(message=_("Failed to reproject 'intersects' geometry."))
        else:
            intersects_geom = options.intersects_geom
        query.intersects(intersects_geom)

    if options.ilike is not None and IFeatureQueryIlike.providedBy(query):
        query.ilike(options.ilike)

    if options.fields is not None:
        query.fields(*options.fields)

    ogr_ds = _ogr_memory_ds()
    _ogr_layer = _ogr_layer_from_features(
        resource,
        query(),
        ds=ogr_ds,
        fields=options.fields,
        use_display_name=options.use_display_name,
        fid=options.fid_field,
    )

    driver = options.driver
    srs = options.srs if options.srs is not None else resource.srs

    vtopts = dict(
        options=[],
        format=driver.name,
        dstSRS=srs.wkt,
        layerName=resource.display_name,
        geometryType=resource.geometry_type,
    )
    if driver.fid_support and options.fid_field is None:
        vtopts["options"].append("-preserve_fid")
    if len(options.lco) > 0:
        vtopts["layerCreationOptions"] = options.lco
    if len(options.dsco) > 0:
        vtopts["datasetCreationOptions"] = options.dsco

    if (
        gdal.VectorTranslate(filepath, ogr_ds, options=gdal.VectorTranslateOptions(**vtopts))
        is None
    ):
        raise RuntimeError(gdal.GetLastErrorMsg())


def _zip_response(request, directory, filename):
    with tempfile.NamedTemporaryFile(suffix=".zip") as tmp_file:
        with zipfile.ZipFile(tmp_file, "w", zipfile.ZIP_DEFLATED) as zipf:
            for root, dirs, files in os.walk(directory):
                for file in files:
                    path = os.path.join(root, file)
                    zipf.write(path, os.path.relpath(path, directory))
        response = FileResponse(tmp_file.name, content_type="application/zip", request=request)
        response.content_disposition = f"attachment; filename={filename}.zip"
        return response


def export_single(resource, request):
    request.resource_permission(PERM_READ)

    params = dict(request.GET)
    for p in ("srs", "intersects_srs"):
        if p in params:
            params[p] = int(params[p])
    options = ExportOptions(**params)

    with tempfile.TemporaryDirectory() as tmp_dir:
        filename = f"{resource.id}.{options.driver.extension}"
        filepath = os.path.join(tmp_dir, filename)

        export(resource, options, filepath)

        zipped = request.GET.get("zipped", "true").lower() == "true"
        if not options.driver.single_file or zipped:
            return _zip_response(request, tmp_dir, filename)
        else:
            response = FileResponse(
                filepath,
                content_type=options.driver.mime or "application/octet-stream",
                request=request,
            )
            response.content_disposition = f"attachment; filename={filename}"
            return response


def view_geojson(resource, request):
    request.resource_permission(PERM_READ)

    options = ExportOptions(format="GeoJSON")

    with tempfile.TemporaryDirectory() as tmp_dir:
        filename = f"{resource.id}.{options.driver.extension}"
        filepath = os.path.join(tmp_dir, filename)

        export(resource, options, filepath)

        response = FileResponse(
            filepath,
            content_type=options.driver.mime or "application/octet-stream",
            request=request,
        )
        response.content_disposition = f"attachment; filename={filename}"
        return response


def view_geojson_head(resource, request):
    return view_geojson(resource, request)


def export_multi(request):
    if request.method == "GET":
        params = dict(request.GET)
        for p in ("srs", "intersects_srs"):
            if p in params:
                params[p] = int(params[p])

        params_resources = list()
        for p in params.pop("resources").split(","):
            splitted = p.split(":")
            param = dict(id=int(splitted[0]))
            for i, key in enumerate(("name",), start=1):
                if len(splitted) <= i:
                    break
                param[key] = splitted[i]
            params_resources.append(param)
    else:
        params = request.json_body
        params_resources = params.pop("resources")
    options = ExportOptions(**params)

    with tempfile.TemporaryDirectory() as tmp_dir:
        for param in params_resources:
            try:
                resource = Resource.filter_by(id=param["id"]).one()
            except NoResultFound:
                raise ResourceNotFound(param["id"])
            request.resource_permission(PERM_READ, resource)

            if "name" in param:
                name = param["name"]
                if name != os.path.basename(name):
                    raise ValidationError(
                        message=_("File name parameter '{}' is not valid.") % name
                    )
            else:
                name = str(resource.id)

            if not options.driver.single_file:
                layer_dir = os.path.join(tmp_dir, name)
                os.mkdir(layer_dir)
            else:
                layer_dir = tmp_dir
            filepath = os.path.join(layer_dir, f"{name}.{options.driver.extension}")

            export(resource, options, filepath)

        return _zip_response(request, tmp_dir, "layers")


def mvt(
    request,
    *,
    resource: Annotated[List[int], Meta(min_length=1)],
    z: Annotated[int, Meta(ge=0, le=22, description="Tile zoom level")],
    x: Annotated[int, Meta(ge=0, description="Tile X coordinate")],
    y: Annotated[int, Meta(ge=0, description="Tile Y coordinate")],
    extent: int = 4096,
    simplification: Optional[float],
    padding: Annotated[float, Meta(ge=0, le=0.5)] = 0.05,
) -> AnyOf[
    Annotated[None, ContentType("application/vnd.mapbox-vector-tile")],
    Annotated[None, StatusCode(204)],
]:
    if not MVT_DRIVER_EXIST:
        return HTTPNotFound(explanation="MVT GDAL driver not found")

    if simplification is None:
        simplification = extent / 512

    # web mercator
    merc = SRS.filter_by(id=3857).one()
    minx, miny, maxx, maxy = merc.tile_extent((z, x, y))

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

    for resid in resource:
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

        _ogr_layer_from_features(obj, query(), name="ngw:%d" % obj.id, ds=ds)

    # flush changes
    ds = None

    filepath = os.path.join("%s" % vsibuf, "%d" % z, "%d" % x, "%d.pbf" % y)

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


ParamLabel = bool
ParamGeom = bool
ParamGeomNull = bool
ParamGeomFormat = Enum("ParamGeomFormat", (("WKT", "wkt"), ("GEOJSON", "geojson")))
ParamDtFormat = Enum("ParamDtFormat", (("ISO", "iso"), ("OBJ", "obj")))
ParamFields = Optional[str]
ParamExtensions = Optional[Annotated[str, Meta(pattern=r"^(\w+(,\w+)*)?$")]]
ParamSrs = Optional[Annotated[int, Meta(gt=0)]]
ParamVersion = Optional[Annotated[int, Meta(gt=0)]]
ParamEpoch = Optional[Annotated[int, Meta(gt=0)]]
ParamOrderBy = Optional[str]
ParamLimit = Optional[Annotated[int, Meta(ge=0)]]
ParamOffset = Annotated[int, Meta(ge=0)]


@dataclass
class Loader:
    resource: Resource
    geom_null: ParamGeomNull
    geom_format: ParamGeomFormat
    dt_format: ParamDtFormat
    srs: ParamSrs

    @cached_property
    def geom_loader(self):
        loader = getattr(Geometry, f"from_{self.geom_format.value}")
        if self.srs is not None:
            srs_from = SRS.filter_by(id=self.srs).one()
            transformer = Transformer(srs_from.wkt, self.resource.srs.wkt)
            transform = transformer.transform
            return lambda val: transform(loader(val))
        return loader

    @cached_property
    def field_loaders(self):
        result = dict()
        for fld in self.resource.fields:
            fld_datatype = fld.datatype
            if fld_datatype in DT_DATATYPES:
                fld_load = DT_LOADERS[self.dt_format.value][fld_datatype]
            else:
                fld_load = lambda val: val
            result[fld.keyname] = fld_load
        return result

    @cached_property
    def extension_loaders(self):
        return dict()

    def __call__(self, feature: Feature, data: Any):
        feature.geom = UNSET
        if (geom := data.get("geom", UNSET)) is not UNSET:
            if geom is not None or self.geom_null:
                try:
                    feature.geom = self.geom_loader(geom)
                except GeometryNotValid:
                    raise ValidationError(_("Geometry is not valid."))

        ftarget = feature.fields
        ftarget.clear()
        if fsource := data.get("fields"):
            loaders = self.field_loaders
            for fkey, fval in fsource.items():
                if loader := loaders.get(fkey):
                    if fval is not None:
                        fval = loader(fval)
                    ftarget[fkey] = fval

    def extensions(self, feature, data):
        updated = False
        if (source := data.get("extensions")) is not None:
            loaders = self.extension_loaders
            for k, v in source.items():
                if (loader := loaders.get(k)) is None:
                    if cls := FeatureExtension.registry.get(k):
                        loaders[k] = loader = cls(feature.layer).deserialize
                    else:
                        continue
                updated = loader(feature, v) or updated
        return updated


@dataclass
class Dumper:
    resource: Resource
    label: ParamLabel
    geom: ParamGeom
    geom_format: ParamGeomFormat
    fields: ParamFields
    dt_format: ParamDtFormat
    extensions: ParamExtensions
    srs: ParamSrs
    version: ParamVersion
    epoch: ParamEpoch

    @cached_property
    def geom_dumper(self):
        if self.geom_format.value == ParamGeomFormat.WKT.value:
            return lambda val: val.wkt
        elif self.geom_format.value == ParamGeomFormat.GEOJSON.value:
            return lambda val: val.to_geojson()
        else:
            raise NotImplementedError

    @cached_property
    def field_dumpers(self):
        result = dict()
        if (fields := self.fields) is not None:
            if fields == "":
                return None
            else:
                fields_set = set(fields.split(","))
        else:
            fields_set = None

        for fld in self.resource.fields:
            fld_keyname = fld.keyname
            if fields_set is not None and fld_keyname not in fields_set:
                continue

            fld_datatype = fld.datatype
            if fld_datatype in DT_DATATYPES:
                fld_dump = DT_DUMPERS[self.dt_format.value][fld_datatype]
            else:
                fld_dump = lambda val: val
            result[fld_keyname] = fld_dump
        return result

    @cached_property
    def extension_dumpers(self):
        result = dict()
        extensions = self.extensions
        if extensions is not None:
            if extensions == "":
                return None
            else:
                extensions_set = set(extensions.split(","))
        else:
            extensions_set = None

        for identity, cls in FeatureExtension.registry.items():
            if extensions_set is not None and identity not in extensions_set:
                continue
            result[identity] = partial(
                cls(self.resource).serialize,
                version=self.version,
            )

        return result

    def feature_query(self):
        query = self.resource.feature_query()
        feature_query_pit(self.resource, query, self.version, self.epoch)
        query.fields(*(self.field_dumpers.keys() if self.field_dumpers is not None else ()))

        if self.geom:
            query.geom()
            if self.geom_format == ParamGeomFormat.WKT:
                query.geom_format("WKT")
            if self.srs:
                query.srs(SRS.filter_by(id=self.srs).one())

        return query

    def __call__(self, feature: Feature) -> Any:
        result = dict(id=feature.id)
        if self.label:
            result["label"] = feature.label

        if self.geom:
            geom = feature.geom
            result["geom"] = self.geom_dumper(geom) if geom is not None else None

        if (fdumpers := self.field_dumpers) is not None:
            fsource = feature.fields
            ftarget = result["fields"] = dict()
            for fkey, fdump in fdumpers.items():
                fval = fsource[fkey]
                ftarget[fkey] = fdump(fval) if fval is not None else None

        if (edumpers := self.extension_dumpers) is not None:
            result["extensions"] = {ident: ext(feature) for ident, ext in edumpers.items()}

        return result


def query_feature_or_not_found(query, resource_id, feature_id):
    """Query one feature by id or return FeatureNotFound exception."""

    query.filter_by(id=feature_id)
    query.limit(1)

    for feat in query():
        return feat

    raise FeatureNotFound(resource_id, feature_id)


@contextmanager
def versioning(resource, request):
    if IVersionableFeatureLayer.providedBy(resource) and resource.fversioning:
        with resource.fversioning_context(request) as vobj:
            yield vobj
    else:
        yield None


def feature_query_pit(resource, feature_query, version, epoch):
    if version is None:
        return
    FVersioningNotEnabled.disprove(resource)
    FVersioningOutOfRange.disprove(resource, version)
    feature_query.pit(version)


def iget(
    resource,
    request,
    *,
    label: ParamLabel = False,
    geom: ParamGeom = True,
    geom_format: ParamGeomFormat = ParamGeomFormat.WKT,
    dt_format: ParamDtFormat = ParamDtFormat.OBJ,
    fields: ParamFields = None,
    extensions: ParamExtensions = None,
    srs: ParamSrs = None,
    version: ParamVersion = None,
    epoch: ParamEpoch = None,
) -> JSONType:
    """Read feature"""
    request.resource_permission(PERM_READ)

    dumper = Dumper(
        resource,
        label=label,
        geom=geom,
        geom_format=geom_format,
        fields=fields,
        dt_format=dt_format,
        extensions=extensions,
        srs=srs,
        version=version,
        epoch=epoch,
    )

    query = dumper.feature_query()
    feature = query_feature_or_not_found(query, resource.id, int(request.matchdict["fid"]))
    return dumper(feature)


def iput(
    resource,
    request,
    *,
    geom_null: ParamGeomNull = False,
    geom_format: ParamGeomFormat = ParamGeomFormat.WKT,
    dt_format: ParamDtFormat = ParamDtFormat.OBJ,
    srs: ParamSrs = None,
) -> JSONType:
    """Update feature"""
    request.resource_permission(PERM_WRITE)

    query = resource.feature_query()
    feature = query_feature_or_not_found(query, resource.id, int(request.matchdict["fid"]))
    loader = Loader(
        resource,
        geom_null=geom_null,
        geom_format=geom_format,
        dt_format=dt_format,
        srs=srs,
    )

    vinfo = dict()
    with versioning(resource, request) as vobj:
        updated = loader.extensions(feature, request.json_body)
        loader(feature, request.json_body)
        if (feature.geom or feature.fields) and IWritableFeatureLayer.providedBy(resource):
            updated = resource.feature_put(feature) or updated
        if updated is True and vobj:
            vinfo["version"] = vobj.version_id

    return dict(id=feature.id, **vinfo)


def idelete(resource, request) -> JSONType:
    """Delete feature"""
    request.resource_permission(PERM_WRITE)

    with versioning(resource, request) as vobj:
        fid = int(request.matchdict["fid"])
        resource.feature_delete(fid)
        result = dict(id=fid)
        if vobj:
            result["version"] = vobj.version_id
        return result


def item_extent(resource, request) -> JSONType:
    request.resource_permission(PERM_READ)
    feature_id = int(request.matchdict["fid"])
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
    return dict(minLon=minLon, minLat=minLat, maxLon=maxLon, maxLat=maxLat)


def geometry_info(resource, request) -> JSONType:
    request.resource_permission(PERM_READ)

    query = resource.feature_query()
    query.geom()
    query.geom_format("WKT")

    srs_param = request.GET.get("srs")
    srs_id = int(srs_param) if srs_param is not None else 3857
    try:
        srs = SRS.filter_by(id=srs_id).one()
    except NoResultFound:
        raise ValidationError(
            message=_("Unknown spatial reference system"), data={"srs.id": srs_id}
        )
    query.srs(srs)

    feature_id = int(request.matchdict["fid"])
    feature = query_feature_or_not_found(query, resource.id, feature_id)

    geom = feature.geom
    shape = geom.shape
    geom_type = shape.geom_type

    minX, minY, maxX, maxY = get_box_bounds(resource, feature_id, srs_id)
    extent = dict(minX=minX, minY=minY, maxX=maxX, maxY=maxY)

    area = abs(geom_area(geom, srs.wkt))
    length = abs(geom_length(geom, srs.wkt))

    if geom_type == "Point":
        area = None
        length = None
    elif geom_type == "LineString" or geom_type == "LinearRing" or geom_type == "MultiLineString":
        area = None

    return dict(type=geom_type, area=area, length=length, extent=extent)


def apply_fields_filter(query, request):
    filter_ = []
    for param in request.GET.keys():
        if param.startswith("fld_"):
            fld_expr = re.sub("^fld_", "", param)
        elif param == "id" or param.startswith("id__"):
            fld_expr = param
        else:
            continue

        try:
            key, operator = fld_expr.rsplit("__", 1)
        except ValueError:
            key, operator = (fld_expr, "eq")

        if key != "id":
            try:
                query.layer.field_by_keyname(key)
            except KeyError:
                raise ValidationError(message="Unknown field '%s'." % key)

        filter_.append((key, operator, request.GET[param]))

    if len(filter_) > 0:
        query.filter(*filter_)

    if "like" in request.GET and IFeatureQueryLike.providedBy(query):
        query.like(request.GET["like"])
    elif "ilike" in request.GET and IFeatureQueryIlike.providedBy(query):
        query.ilike(request.GET["ilike"])


def apply_intersect_filter(query, request, resource):
    # Filtering by extent
    if "intersects" in request.GET:
        wkt_intersects = request.GET["intersects"]
    # Workaround to pass huge geometry for intersection filter
    elif request.content_type == "application/json" and "intersects" in (
        json_body := request.json_body
    ):
        wkt_intersects = json_body["intersects"]
    else:
        wkt_intersects = None

    if wkt_intersects is not None:
        try:
            geom = Geometry.from_wkt(wkt_intersects, srid=resource.srs.id)
        except GeometryNotValid:
            raise ValidationError(_("Parameter 'intersects' geometry is not valid."))
        query.intersects(geom)


def cget(
    resource,
    request,
    *,
    label: ParamLabel = False,
    geom: ParamGeom = True,
    geom_format: ParamGeomFormat = ParamGeomFormat.WKT,
    dt_format: ParamDtFormat = ParamDtFormat.OBJ,
    fields: ParamFields = None,
    extensions: ParamExtensions = None,
    srs: ParamSrs = None,
    order_by: ParamOrderBy = None,
    limit: ParamLimit = None,
    offset: ParamOffset = 0,
    version: ParamVersion = None,
    epoch: ParamEpoch = None,
) -> JSONType:
    """Read features"""
    request.resource_permission(PERM_READ)

    dumper = Dumper(
        resource,
        label=label,
        geom=geom,
        geom_format=geom_format,
        fields=fields,
        dt_format=dt_format,
        extensions=extensions,
        srs=srs,
        version=version,
        epoch=epoch,
    )

    query = dumper.feature_query()

    # Paging
    if limit is not None:
        query.limit(limit, offset)

    apply_fields_filter(query, request)
    apply_intersect_filter(query, request, resource)

    # Ordering
    order_by_ = []
    if order_by is not None:
        for order_def in list(order_by.split(",")):
            order, colname = re.match(r"^(\-|\+|%2B)?(.*)$", order_def).groups()
            if colname is not None:
                order = ["asc", "desc"][order == "-"]
                order_by_.append([order, colname])

    if order_by_:
        query.order_by(*order_by_)

    return [dumper(feature) for feature in query()]


def cpost(
    resource,
    request,
    *,
    geom_null: ParamGeomNull = False,
    geom_format: ParamGeomFormat = ParamGeomFormat.WKT,
    dt_format: ParamDtFormat = ParamDtFormat.OBJ,
    srs: ParamSrs = None,
) -> JSONType:
    """Create feature"""
    request.resource_permission(PERM_WRITE)

    loader = Loader(
        resource,
        geom_null=geom_null,
        geom_format=geom_format,
        dt_format=dt_format,
        srs=srs,
    )

    with versioning(resource, request) as vobj:
        feature = Feature(layer=resource)
        loader(feature, request.json_body)
        feature.id = resource.feature_create(feature)
        loader.extensions(feature, request.json_body)
        vinfo = dict(version=vobj.version_id) if vobj else dict()

    return dict(id=feature.id, **vinfo)


def cpatch(
    resource,
    request,
    *,
    geom_null: ParamGeomNull = False,
    geom_format: ParamGeomFormat = ParamGeomFormat.WKT,
    dt_format: ParamDtFormat = ParamDtFormat.OBJ,
    srs: ParamSrs = None,
) -> JSONType:
    """Update features"""
    request.resource_permission(PERM_WRITE)

    loader = Loader(
        resource,
        geom_null=geom_null,
        geom_format=geom_format,
        dt_format=dt_format,
        srs=srs,
    )

    result = list()
    with versioning(resource, request) as vobj:
        vinfo = dict(version=vobj.version_id) if vobj else dict()
        for fdata in request.json_body:
            if "id" not in fdata:
                # Create new feature
                feature = Feature(layer=resource)
                loader(feature, fdata)
                feature.id = resource.feature_create(feature)
                loader.extensions(feature, fdata)
            else:
                # Update existing feature
                query = resource.feature_query()
                feature = query_feature_or_not_found(query, resource.id, fdata["id"])

                have_changes = loader.extensions(feature, fdata)
                if have_changes and vobj:
                    vobj.mark_changed()

                loader(feature, fdata)
                if (feature.geom or feature.fields) and IWritableFeatureLayer.providedBy(resource):
                    resource.feature_put(feature)

            result.append(dict(id=feature.id, **vinfo))

    return result


def cdelete(resource, request) -> JSONType:
    """Delete features"""
    request.resource_permission(PERM_WRITE)

    with versioning(resource, request):
        if len(request.body) > 0:
            result = []
            for fdata in request.json_body:
                if "id" in fdata:
                    fid = fdata["id"]
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

    query = resource.feature_query()

    apply_fields_filter(query, request)
    apply_intersect_filter(query, request, resource)

    extent = query().extent
    return dict(extent=extent)


def setup_pyramid(comp, config):
    feature_layer_factory = ResourceFactory(context=IFeatureLayer)

    geojson_route = config.add_route(
        "feature_layer.geojson",
        "/api/resource/{id}/geojson",
        factory=feature_layer_factory,
        get=view_geojson,
    )

    # HEAD method is required for GDAL /vsicurl/ and QGIS connect
    geojson_route.head(view_geojson_head, deprecated=True)

    config.add_view(
        export_single,
        route_name="resource.export",
        context=IFeatureLayer,
        request_method="GET",
    )

    config.add_route(
        "feature_layer.export",
        "/api/component/feature_layer/export",
        get=export_multi,
        post=export_multi,
    )

    config.add_route(
        "feature_layer.mvt",
        "/api/component/feature_layer/mvt",
        get=mvt,
    )

    config.add_route(
        "feature_layer.feature.item",
        "/api/resource/{id}/feature/{fid}",
        factory=feature_layer_factory,
        types=dict(fid=FeatureID),
        get=iget,
        put=iput,
    ).delete(idelete, context=IWritableFeatureLayer)

    config.add_route(
        "feature_layer.feature.item_extent",
        "/api/resource/{id}/feature/{fid}/extent",
        factory=feature_layer_factory,
        types=dict(fid=FeatureID),
        get=item_extent,
    )

    config.add_route(
        "feature_layer.feature.geometry_info",
        "/api/resource/{id}/feature/{fid}/geometry_info",
        factory=feature_layer_factory,
        types=dict(fid=FeatureID),
        get=geometry_info,
    )

    config.add_route(
        "feature_layer.feature.collection",
        "/api/resource/{id}/feature/",
        factory=feature_layer_factory,
        get=cget,
    ).post(cpost, context=IWritableFeatureLayer).patch(
        cpatch, context=IWritableFeatureLayer
    ).delete(
        cdelete, context=IWritableFeatureLayer
    )

    config.add_route(
        "feature_layer.feature.count",
        "/api/resource/{id}/feature_count",
        factory=feature_layer_factory,
        get=count,
    )

    config.add_route(
        "feature_layer.feature.extent",
        "/api/resource/{id}/feature_extent",
        factory=feature_layer_factory,
        get=feature_extent,
    )

    from .identify import identify

    config.add_route(
        "feature_layer.identify",
        "/api/feature_layer/identify",
        post=identify,
    )

    from .transaction import api as transaction_api
    from .versioning import api as versioning_api

    transaction_api.setup_pyramid(comp, config)
    versioning_api.setup_pyramid(comp, config)
