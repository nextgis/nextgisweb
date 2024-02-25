import os
import tempfile
import zipfile

from osgeo import gdal
from pyramid.response import FileResponse
from sqlalchemy.orm.exc import NoResultFound

from nextgisweb.env import _, env
from nextgisweb.lib.geometry import Geometry, GeometryNotValid, Transformer

from nextgisweb.core.exception import ValidationError
from nextgisweb.resource import DataScope, Resource, ResourceFactory
from nextgisweb.resource.exception import ResourceNotFound
from nextgisweb.spatial_ref_sys import SRS

from .interface import IFeatureLayer, IFeatureQueryIlike
from .ogrdriver import EXPORT_FORMAT_OGR


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
    request.resource_permission(DataScope.read)

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
            request.resource_permission(DataScope.read, resource)

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
