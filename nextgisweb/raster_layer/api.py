# -*- coding: utf-8 -*-
from __future__ import division, absolute_import, print_function, unicode_literals

import tempfile
import itertools

from io import BytesIO
from osgeo import gdal
from pyramid.response import FileResponse

from ..env import env
from ..spatial_ref_sys import SRS
from ..resource import ValidationError, DataScope
from .gdaldriver import EXPORT_FORMAT_GDAL
from .model import RasterLayer
from .util import _


PERM_READ = DataScope.read
PERM_WRITE = DataScope.write


def export(request):
    request.resource_permission(PERM_READ)

    srs = int(request.GET.get("srs", request.context.srs.id))
    srs = SRS.filter_by(id=srs).one()
    format = request.GET.get("format")

    if format is None:
        raise ValidationError(_("Output format is not provided."))
    else:
        format = format.upper()

    if format not in EXPORT_FORMAT_GDAL:
        raise ValidationError(_("Format '%s' is not supported.") % (format,))

    driver = EXPORT_FORMAT_GDAL[format]

    # creation options
    co = list(driver.options or [])
    wopts = ["-f", driver.name, "-t_srs", srs.wkt] + list(
        itertools.chain(*[("-co", o) for o in co])
    )

    filename = "%d.%s" % (request.context.id, driver.extension,)

    content_disposition = b"attachment; filename=%s" % filename

    buf = BytesIO()

    with tempfile.NamedTemporaryFile(suffix=".%s" % driver.extension) as tmp_file:
        gdal.Warp(
            tmp_file.name,
            env.raster_layer.workdir_filename(request.context.fileobj),
            options=gdal.WarpOptions(options=wopts),
        )

        response = FileResponse(tmp_file.name, content_type=driver.mime)
        response.content_disposition = content_disposition
        return response


def setup_pyramid(comp, config):
    config.add_view(
        export, route_name="resource.export", context=RasterLayer, request_method="GET"
    )
