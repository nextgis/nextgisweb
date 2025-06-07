import os
import tempfile
from io import DEFAULT_BUFFER_SIZE
from typing import Annotated, List, Literal, Union

from msgspec import Meta, Struct
from osgeo import gdal
from pyramid.httpexceptions import HTTPNotFound
from pyramid.response import FileIter, FileResponse, Response

from nextgisweb.env import env, gettext
from nextgisweb.lib.apitype import AnyOf, ContentType, Query, StatusCode

from nextgisweb.core.exception import ValidationError
from nextgisweb.pyramid import XMLType
from nextgisweb.pyramid.util import set_output_buffering
from nextgisweb.resource import DataScope, ResourceFactory
from nextgisweb.spatial_ref_sys import SRS

from .gdaldriver import EXPORT_FORMAT_GDAL
from .model import RasterLayer


class ExportParams(Struct, kw_only=True):
    srs: Annotated[Union[int, None], Meta(description="SRS ID")] = None
    bands: Annotated[
        Union[List[Annotated[int, Meta(ge=1)]], None], Meta(description="List of bands")
    ] = None
    format: Annotated[
        Literal[tuple(EXPORT_FORMAT_GDAL)],
        Meta(description="Output format"),
    ] = "GTiff"  # type: ignore


ExportResponse = AnyOf[
    tuple(
        Annotated[
            FileResponse,
            ContentType(driver.mime),
        ]
        for driver in (EXPORT_FORMAT_GDAL[format] for format in EXPORT_FORMAT_GDAL)
        if driver.mime is not None
    )
    + (Annotated[Response, ContentType("application/octet-stream")],)
]  # type: ignore


class RangeFileWrapper(FileIter):
    def __init__(self, file, block_size=DEFAULT_BUFFER_SIZE, offset=0, length=0):
        super().__init__(file=file, block_size=block_size)
        self.file.seek(offset, os.SEEK_SET)
        self.remaining = length

    def __next__(self):
        if self.remaining <= 0:
            raise StopIteration()
        data = self.file.read(min(self.remaining, self.block_size))
        if not data:
            raise StopIteration()
        self.remaining -= len(data)
        return data


def export(
    resource,
    request,
    *,
    export_params: Annotated[ExportParams, Query(spread=True)],
) -> ExportResponse:  # type: ignore
    request.resource_permission(DataScope.read)

    srs = (
        SRS.filter_by(id=export_params.srs).one()
        if export_params.srs is not None
        else resource.srs
    )
    bands = export_params.bands
    format = export_params.format

    driver = EXPORT_FORMAT_GDAL[format]

    filename = "%d.%s" % (
        resource.id,
        driver.extension,
    )
    content_disposition = "attachment; filename=%s" % filename

    def _warp(source_filename):
        with tempfile.NamedTemporaryFile(suffix=".%s" % driver.extension) as tmp_file:
            try:
                gdal.UseExceptions()
                gdal.Warp(
                    tmp_file.name,
                    source_filename,
                    options=gdal.WarpOptions(
                        format=driver.name, dstSRS=srs.wkt, creationOptions=driver.options
                    ),
                )
            except RuntimeError as e:
                raise ValidationError(str(e))
            finally:
                gdal.DontUseExceptions()

            response = FileResponse(tmp_file.name, content_type=driver.mime)
            response.content_disposition = content_disposition
            return response

    source_filename = env.raster_layer.workdir_path(resource.fileobj, resource.fileobj_pam)
    if bands is not None and len(bands) != resource.band_count:
        with tempfile.NamedTemporaryFile(suffix=".tif") as tmp_file:
            gdal.Translate(tmp_file.name, str(source_filename), bandList=bands)
            return _warp(tmp_file.name)
    else:
        return _warp(str(source_filename))


def cog_head(
    resource: RasterLayer, request
) -> Annotated[Response, ContentType("image/tiff; application=geotiff; profile=cloud-optimized")]:
    """Cloud optimized GeoTIFF endpoint"""
    request.resource_permission(DataScope.read)

    if not resource.cog:
        raise ValidationError(gettext("Requested raster is not COG."))

    return Response(
        accept_ranges="bytes",
        content_length=resource.fileobj.size,
        content_type="image/tiff; application=geotiff; profile=cloud-optimized",
    )


def cog_get(
    resource: RasterLayer, request
) -> Annotated[
    Response,
    StatusCode(206),
    ContentType("image/tiff; application=geotiff; profile=cloud-optimized"),
]:
    """Cloud optimized GeoTIFF endpoint"""

    request.resource_permission(DataScope.read)

    if not resource.cog:
        raise ValidationError(gettext("Requested raster is not COG."))

    range = request.range
    if range is None:
        raise ValidationError(gettext("Range header is missed or invalid."))

    content_range = range.content_range(resource.fileobj.size)
    if content_range is None:
        raise ValidationError(gettext("Range %s can not be read." % range))

    content_length = content_range.stop - content_range.start
    response = Response(
        status_code=206,
        content_range=content_range,
        content_type="image/tiff; application=geotiff; profile=cloud-optimized",
    )

    response.app_iter = RangeFileWrapper(
        open(resource.fileobj.filename(), "rb"),
        offset=content_range.start,
        length=content_length,
    )
    response.content_length = content_length

    return response


def download(
    resource: RasterLayer, request
) -> Annotated[FileResponse, ContentType("image/tiff; application=geotiff")]:
    """Download raster in internal representation format"""

    request.resource_permission(DataScope.read)

    response = FileResponse(
        resource.fileobj.filename(),
        content_type="image/tiff; application=geotiff",
        request=request,
    )
    response.content_disposition = "attachment; filename=%s.tif" % request.context.id
    set_output_buffering(request, response, False)
    return response


def pam_get(resource: RasterLayer, request) -> XMLType:
    """GDAL Persistent Auxiliary Metadata (PAM)"""

    request.resource_permission(DataScope.read)

    if (fileobj_pam := resource.fileobj_pam) is not None:
        pam_data = fileobj_pam.filename().read_text()
    else:
        raise HTTPNotFound()

    return Response(pam_data, content_type="application/xml")


def pam_head(resource: RasterLayer, request) -> Response:
    """GDAL Persistent Auxiliary Metadata (PAM)"""

    request.resource_permission(DataScope.read)

    if resource.fileobj_pam is None:
        raise HTTPNotFound()

    return Response(
        content_length=resource.fileobj_pam.size,
        content_type="application/xml",
    )


def setup_pyramid(comp, config):
    config.add_view(
        export,
        route_name="resource.export",
        context=RasterLayer,
        request_method="GET",
    )

    raster_layer_factory = ResourceFactory(context=RasterLayer)

    config.add_route(
        "raster_layer.cog",
        "/api/resource/{id}/cog",
        factory=raster_layer_factory,
        head=cog_head,
        get=cog_get,
    )

    config.add_route(
        "raster_layer.pam_cog",
        "/api/resource/{id}/cog.aux.xml",
        factory=raster_layer_factory,
        head=pam_head,
        get=pam_get,
    )

    config.add_route(
        "raster_layer.download",
        "/api/resource/{id}/download",
        factory=raster_layer_factory,
        get=download,
    )

    config.add_route(
        "raster_layer.pam",
        "/api/resource/{id}/download.aux.xml",
        factory=raster_layer_factory,
        head=pam_head,
        get=pam_get,
    )

    from . import api_identify

    api_identify.setup_pyramid(comp, config)
