import os
import tempfile
import zipfile
from typing import TYPE_CHECKING, Dict, Iterable, List, Literal, Tuple, Union

from msgspec import UNSET, Meta, Struct, UnsetType, field
from osgeo import gdal, ogr
from pyramid.response import FileResponse, Response
from sqlalchemy.orm.exc import NoResultFound
from typing_extensions import Annotated

from nextgisweb.env import env, gettext, gettextf
from nextgisweb.lib.apitype import ContentType, Query
from nextgisweb.lib.geometry import Geometry, GeometryNotValid, Transformer

from nextgisweb.core.exception import ValidationError
from nextgisweb.resource import DataScope, Resource, ResourceFactory
from nextgisweb.resource.exception import ResourceNotFound
from nextgisweb.resource.view import ResourceID
from nextgisweb.spatial_ref_sys import SRS
from nextgisweb.spatial_ref_sys.api import SRSID

from .feature import Feature
from .interface import IFeatureLayer, IFeatureQueryIlike
from .model import LayerField
from .ogrdriver import EXPORT_FORMAT_OGR, OGRDriverT
from .util import unique_name


def _ogr_memory_ds():
    return gdal.GetDriverByName("Memory").Create("", 0, 0, 0, gdal.GDT_Unknown)


FieldMap = List[Tuple[str, LayerField]]


# Returns an ordered list with OGR field name and LayerField pair
def get_field_map(
    fields: Union[List[str], None], layer_fields: List[LayerField], use_display_name: bool
) -> FieldMap:
    if fields is not None:
        layer_fields = sorted(
            (f for f in layer_fields if f.keyname in fields), key=lambda f: fields.index(f.keyname)
        )
    return [(f.display_name if use_display_name else f.keyname, f) for f in layer_fields]


def _ogr_layer_from_features(
    layer: IFeatureLayer,
    features: Iterable[Feature],
    *,
    ds: gdal.Dataset,
    name: str = "",
    field_map: Union[FieldMap, None] = None,
    fid: Union[str, None] = None,
    make_valid: bool = False,
) -> ogr.Layer:
    if field_map is not None:
        layer_fields = [field for _, field in field_map]
        aliases = {field.keyname: alias for alias, field in field_map}
    else:
        layer_fields = layer.fields
        aliases = None

    ogr_layer = layer.to_ogr(ds, name=name, fields=layer_fields, aliases=aliases, fid=fid)
    layer_defn = ogr_layer.GetLayerDefn()

    f_kw = dict()
    if fid is not None:
        f_kw["fid"] = fid
    if aliases is not None:
        f_kw["aliases"] = aliases

    for f in features:
        if make_valid:
            f.geom = Geometry(ogr=f.geom.ogr.MakeValid())
        ogr_layer.CreateFeature(f.to_ogr(layer_defn, **f_kw))

    return ogr_layer


class ExportOptions(Struct):
    driver: OGRDriverT
    dsco: List[str] = field(default_factory=list)
    lco: List[str] = field(default_factory=list)
    srs: Union[SRS, None] = None
    intersects_geom: Union[Geometry, None] = None
    intersects_srs: Union[SRS, None] = None
    fields: Union[List[str], None] = None
    fid_field: Union[str, None] = None
    use_display_name: bool = False
    ilike: Union[str, None] = None

    def for_fields(self, ogr_fields: List[str]) -> "ExportOptions":
        opts = ExportOptions(
            driver=self.driver,
            dsco=self.dsco.copy(),
            lco=self.lco.copy(),
            srs=self.srs,
            intersects_geom=self.intersects_geom,
            intersects_srs=self.intersects_srs,
            fields=self.fields,
            fid_field=self.fid_field,
            use_display_name=self.use_display_name,
            ilike=self.ilike,
        )

        if opts.fid_field is not None:
            if opts.fid_field in ogr_fields:
                raise ValidationError(
                    gettextf("Couldn't add FID field '{}'. Such field already exists.")(
                        opts.fid_field
                    )
                )
            ogr_fields.append(opts.fid_field)

        # Set GPKG FID field
        if opts.driver.name == "GPKG":
            gpkg_fid = unique_name("fid", ogr_fields)
            opts.lco.append(f"FID={gpkg_fid}")

        # Set GeoJSON feature ID via additional field
        elif opts.driver.name == "GeoJSON":
            if opts.fid_field is None:
                opts.fid_field = unique_name("gj_fid", ogr_fields)
                opts.lco.append(f"ID_FIELD={opts.fid_field}")

        return opts


if TYPE_CHECKING:
    ExportFormat = Literal["GPKG", "GeoJSON"]
else:
    ExportFormat = Annotated[
        Literal[tuple(EXPORT_FORMAT_OGR.keys())],
        Meta(description="Output format"),
    ]


class ExportParams(Struct, kw_only=True):
    format: ExportFormat
    srs: Annotated[
        Union[SRSID, UnsetType],
        Meta(description="Spatial Reference System ID for output"),
    ] = UNSET
    fid: Annotated[
        Union[str, UnsetType],
        Meta(description="Field name to store original feature ID"),
    ] = UNSET
    fields: Annotated[
        Union[List[str], UnsetType],
        Meta(description="Field keynames to export"),
    ] = UNSET
    display_name: Annotated[
        Union[bool, UnsetType],
        Meta(description="Use display name for fields, otherwise keyname"),
    ] = UNSET
    encoding: Union[str, UnsetType] = UNSET

    # Filters

    intersects: Annotated[
        Union[str, UnsetType],
        Meta(description="Filter features using WKT geometry"),
    ] = UNSET
    intersects_srs: Annotated[
        Union[SRSID, UnsetType],
        Meta(description="SRS ID for intersecting geometry"),
    ] = UNSET
    ilike: Annotated[
        Union[str, UnsetType],
        Meta(description="Filter features using ILIKE condition"),
    ] = UNSET

    def to_options(self) -> ExportOptions:
        driver = EXPORT_FORMAT_OGR[self.format]

        opts = ExportOptions(driver=driver)

        if driver.options is not None:
            opts.lco.extend(driver.options)

        # KML should be created as WGS84
        if driver.name == "LIBKML":
            opts.srs = SRS.filter_by(id=4326).one()
        elif self.srs is not UNSET:
            opts.srs = SRS.filter_by(id=self.srs).one()

        if self.fid is not UNSET and self.fid != "":
            opts.fid_field = self.fid
        if self.fields is not UNSET:
            opts.fields = self.fields
        if self.display_name is not UNSET:
            opts.use_display_name = self.display_name

        if (encoding := self.encoding) is UNSET:
            encoding = "UTF-8"
        opts.lco.append(f"ENCODING={encoding}")

        if self.intersects is not UNSET:
            try:
                opts.intersects_geom = Geometry.from_wkt(self.intersects)
            except GeometryNotValid:
                raise ValidationError(
                    message=gettext("Parameter 'intersects' geometry is not valid.")
                )

            if self.intersects_srs is not UNSET:
                opts.intersects_srs = SRS.filter_by(id=self.intersects_srs).one()

        if self.ilike is not UNSET:
            opts.ilike = self.ilike

        return opts


class ResourceParam(Struct, kw_only=True):
    id: ResourceID
    name: Annotated[
        Union[str, None],
        Meta(description="Optional output layer name, resource ID used by default"),
    ] = None


class ExportParamsPost(ExportParams):
    resources: Annotated[
        Annotated[List[ResourceParam], Meta(min_length=1)],
        Meta(description="Resources to export"),
    ]


def export(resource: IFeatureLayer, options: ExportOptions, filepath: str):
    field_map = get_field_map(options.fields, resource.fields, options.use_display_name)

    options = options.for_fields([alias for alias, _ in field_map])

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
        field_map=field_map,
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


ExportZipResponse = Annotated[Response, ContentType("application/zip")]


def export_single(
    resource,
    request,
    *,
    export_params: Annotated[ExportParams, Query(spread=True)],
    zipped: Annotated[
        bool,
        Meta(description="Compress exported file when using single-file formats"),
    ] = True,
) -> Response:
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
                content_type=options.driver.mime,
                request=request,
            )
            response.content_disposition = f"attachment; filename={filename}"
            return response


GEOJSON_DRIVER = EXPORT_FORMAT_OGR["GeoJSON"]


def view_geojson(resource, request) -> Annotated[Response, ContentType(GEOJSON_DRIVER.mime)]:
    """Export feature layer in GeoJSON format"""
    request.resource_permission(DataScope.read)

    options = ExportOptions(driver=GEOJSON_DRIVER)

    with tempfile.TemporaryDirectory() as tmp_dir:
        filename = f"{resource.id}.{options.driver.extension}"
        filepath = os.path.join(tmp_dir, filename)

        export(resource, options, filepath)

        response = FileResponse(
            filepath,
            content_type=GEOJSON_DRIVER.mime,
            request=request,
        )
        response.content_disposition = f"attachment; filename={filename}"
        return response


def view_geojson_head(resource, request):
    return view_geojson(resource, request)


def export_multi_get(
    request,
    *,
    resources: Annotated[
        Annotated[List[ResourceID], Meta(min_length=1)],
        Meta(description="IDs of resources to export"),
    ],
    export_params: Annotated[ExportParams, Query(spread=True)],
    name: Annotated[
        Dict[ResourceID, str],
        Meta(description="Optional names for layers, resource IDs used by default"),
    ],
) -> ExportZipResponse:
    """Export multiple feature layers"""
    params_resources = [
        ResourceParam(id=rid, name=(name.get(rid) if name is not UNSET else None))
        for rid in resources
    ]
    return export_multi(request, params_resources, export_params)


def export_multi_post(
    request,
    body: ExportParamsPost,
) -> ExportZipResponse:
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
