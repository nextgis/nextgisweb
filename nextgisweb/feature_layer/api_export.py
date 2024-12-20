import os
import tempfile
import zipfile
from dataclasses import dataclass
from dataclasses import field as dataclass_field
from enum import Enum
from typing import Dict, List, Optional

from msgspec import Meta, Struct
from osgeo import gdal
from pyramid.response import FileResponse
from sqlalchemy.orm.exc import NoResultFound
from typing_extensions import Annotated

from nextgisweb.env import env, gettext, gettextf
from nextgisweb.lib.apitype import Query
from nextgisweb.lib.geometry import Geometry, GeometryNotValid, Transformer

from nextgisweb.core.exception import ValidationError
from nextgisweb.resource import DataScope, Resource, ResourceFactory
from nextgisweb.resource.exception import ResourceNotFound
from nextgisweb.resource.view import ResourceID
from nextgisweb.spatial_ref_sys import SRS

from .interface import IFeatureLayer, IFeatureQueryIlike
from .ogrdriver import EXPORT_FORMAT_OGR, OGRDriverT


def _ogr_memory_ds():
    return gdal.GetDriverByName("Memory").Create("", 0, 0, 0, gdal.GDT_Unknown)


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


@dataclass
class ExportOptions:
    driver: OGRDriverT
    dsco: List[str] = dataclass_field(default_factory=list)
    lco: List[str] = dataclass_field(default_factory=list)
    srs: Optional[SRS] = None
    intersects_geom: Optional[Geometry] = None
    intersects_srs: Optional[SRS] = None
    fields: Optional[List] = None
    fid_field: Optional[str] = None
    use_display_name: bool = False
    ilike: Optional[str] = None


ExportFormat = Enum("ExportFormat", {i: i for i in EXPORT_FORMAT_OGR.keys()})


class ExportParams(Struct, kw_only=True):
    format: ExportFormat
    encoding: Optional[str] = None
    srs: Optional[int] = None
    intersects: Optional[str] = None
    intersects_srs: Optional[int] = None
    ilike: Optional[str] = None
    fields: Optional[List[str]] = None
    fid: Annotated[str, Meta(description="Field name to store original feature ID")] = ""
    display_name: Annotated[
        bool, Meta(description="Use display name for fields, otherwise keyname")
    ] = False

    def to_options(self) -> ExportOptions:
        driver = EXPORT_FORMAT_OGR[self.format.value]

        opts = ExportOptions(driver=driver)

        if driver.options is not None:
            opts.lco.extend(driver.options)
        if self.encoding is not None:
            opts.lco.append(f"ENCODING={self.encoding}")

        # KML should be created as WGS84
        if driver.name == "LIBKML":
            opts.srs = SRS.filter_by(id=4326).one()
        elif self.srs is not None:
            opts.srs = SRS.filter_by(id=self.srs).one()

        if self.intersects is not None:
            try:
                opts.intersects_geom = Geometry.from_wkt(self.intersects)
            except GeometryNotValid:
                raise ValidationError(
                    message=gettext("Parameter 'intersects' geometry is not valid.")
                )

            if self.intersects_srs is not None:
                opts.intersects_srs = SRS.filter_by(id=self.intersects_srs).one()

        self.fields = self.fields
        if self.fid is not None and self.fid != "":
            opts.fid_field = self.fid
        opts.use_display_name = self.display_name
        opts.ilike = self.ilike

        return opts


class ResourceParam(Struct, kw_only=True):
    id: ResourceID
    name: Optional[str] = None


class ExportParamsPost(ExportParams):
    resources: List[ResourceParam]


def export(resource, options, filepath):
    query = resource.feature_query()

    if (export_limit := env.feature_layer.export_limit) is not None:
        total_count = query().total_count

        if total_count > export_limit:
            raise ValidationError(
                message=gettextf(
                    "The export limit is set to {limit} features, but the layer contains {count}."
                )(limit=export_limit, count=total_count)
            )

    query.geom()

    if options.intersects_geom is not None:
        if options.intersects_srs is not None and options.intersects_srs.id != resource.srs_id:
            transformer = Transformer(options.intersects_srs.wkt, resource.srs.wkt)
            try:
                intersects_geom = transformer.transform(options.intersects_geom)
            except ValueError:
                raise ValidationError(
                    message=gettext("Failed to reproject 'intersects' geometry.")
                )
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


def export_single(
    resource,
    request,
    *,
    zipped: bool,
    export_params: Annotated[ExportParams, Query(spread=True)],
):
    """Export feature layer"""
    request.resource_permission(DataScope.read)

    options = export_params.to_options()

    with tempfile.TemporaryDirectory() as tmp_dir:
        filename = f"{resource.id}.{options.driver.extension}"
        filepath = os.path.join(tmp_dir, filename)

        export(resource, options, filepath)

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
    request.resource_permission(DataScope.read)

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


def export_multi_get(
    request,
    *,
    name: Dict[int, str],
    resources: List[ResourceID],
    export_params: Annotated[ExportParams, Query(spread=True)],
):
    """Export multiple feature layers"""
    params_resources = [ResourceParam(id=rid, name=name.get(rid)) for rid in resources]
    return export_multi(request, params_resources, export_params)


def export_multi_post(
    request,
    body: ExportParamsPost,
):
    """Export multiple feature layers"""
    return export_multi(request, body.resources, body)


def export_multi(
    request,
    params_resources: List[ResourceParam],
    export_params: ExportParams,
):
    options = export_params.to_options()

    with tempfile.TemporaryDirectory() as tmp_dir:
        for pr in params_resources:
            try:
                resource = Resource.filter_by(id=pr.id).one()
            except NoResultFound:
                raise ResourceNotFound(pr.id)
            request.resource_permission(DataScope.read, resource)

            if pr.name is not None:
                if pr.name != os.path.basename(pr.name):
                    raise ValidationError(
                        message=gettext("File name parameter '{}' is not valid.") % pr.name
                    )
                layer_name = pr.name
            else:
                layer_name = str(resource.id)

            if not options.driver.single_file:
                layer_dir = os.path.join(tmp_dir, layer_name)
                os.mkdir(layer_dir)
            else:
                layer_dir = tmp_dir
            filepath = os.path.join(layer_dir, f"{layer_name}.{options.driver.extension}")

            export(resource, options, filepath)

        return _zip_response(request, tmp_dir, "layers")


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
        get=export_multi_get,
        post=export_multi_post,
    )
