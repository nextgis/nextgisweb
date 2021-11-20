import os
import tempfile
from nextgisweb.resource.view import resource_factory

from osgeo import gdal
from pyramid.response import FileResponse, Response

from ..core.exception import ValidationError
from ..env import env
from ..spatial_ref_sys import SRS
from ..resource import DataScope
from .gdaldriver import EXPORT_FORMAT_GDAL
from .model import RasterLayer
from .util import _


PERM_READ = DataScope.read
PERM_WRITE = DataScope.write


def export(request):
    request.resource_permission(PERM_READ)

    srs = int(request.GET.get("srs", request.context.srs.id))
    srs = SRS.filter_by(id=srs).one()
    format = request.GET.get("format", "GTiff")
    bands = request.GET.getall("bands")

    if format is None:
        raise ValidationError(_("Output format is not provided."))

    if format not in EXPORT_FORMAT_GDAL:
        raise ValidationError(_("Format '%s' is not supported.") % (format,))

    driver = EXPORT_FORMAT_GDAL[format]

    filename = "%d.%s" % (request.context.id, driver.extension,)
    content_disposition = "attachment; filename=%s" % filename

    def _warp(source_filename):
        with tempfile.NamedTemporaryFile(suffix=".%s" % driver.extension) as tmp_file:
            try:
                gdal.UseExceptions()
                gdal.Warp(
                    tmp_file.name, source_filename,
                    options=gdal.WarpOptions(
                        format=driver.name, dstSRS=srs.wkt,
                        creationOptions=driver.options
                    ),
                )
            except RuntimeError as e:
                raise ValidationError(str(e))
            finally:
                gdal.DontUseExceptions()

            response = FileResponse(tmp_file.name, content_type=driver.mime)
            response.content_disposition = content_disposition
            return response

    source_filename = env.raster_layer.workdir_filename(request.context.fileobj)
    if len(bands) != request.context.band_count:
        with tempfile.NamedTemporaryFile(suffix=".tif") as tmp_file:
            gdal.Translate(tmp_file.name, source_filename, bandList=bands)
            return _warp(tmp_file.name)
    else:
        return _warp(source_filename)


def cog(resource, request):
    request.resource_permission(PERM_READ)

    fn = env.raster_layer.workdir_filename(resource.fileobj)
    filesize = os.path.getsize(fn)

    if request.method == "HEAD":
        return Response(
            accept_ranges="bytes",
            content_length=filesize,
            content_type="image/geo+tiff"
        )

    if request.method == "GET":
        if not resource.cog:
            raise ValidationError(_("Requested raster is not COG."))

        range = request.range
        if range is None:
            raise ValidationError(_("Range header is missed or invalid."))

        content_range = range.content_range(filesize)
        if content_range is None:
            raise ValidationError(_("Range %s can not be read." % range))

        content_length = content_range.stop - content_range.start
        response = Response(
            status_code=206,
            content_length=content_length,
            content_range=content_range,
            content_type="image/geo+tiff"
        )

        with open(fn, "rb") as f:
            f.seek(content_range.start)
            response.body = f.read(content_length)

        return response


def setup_pyramid(comp, config):
    config.add_view(
        export, route_name="resource.export", context=RasterLayer, request_method="GET"
    )
    config.add_route(
        "raster_layer.cog", "/api/resource/{id}/cog",
        factory=resource_factory) \
        .add_view(cog, context=RasterLayer, request_method="GET")
