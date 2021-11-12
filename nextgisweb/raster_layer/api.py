import tempfile

from osgeo import gdal
from pyramid.response import FileResponse

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


def setup_pyramid(comp, config):
    config.add_view(
        export, route_name="resource.export", context=RasterLayer, request_method="GET"
    )
