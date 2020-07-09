# -*- coding: utf-8 -*-
from __future__ import division, absolute_import, print_function, unicode_literals
import collections


EXPORT_FORMAT_GDAL = {}


GDALDriver = collections.namedtuple(
    "GDALDriver",
    [
        "name",
        "extension",
        "options",
        "mime",
    ],
)

EXPORT_FORMAT_GDAL["TIF"] = GDALDriver(
    "GTiff",
    "tif",
    options=(
        "COMPRESS=LZW",
    ),
    mime="image/tiff; application=geotiff",
)

EXPORT_FORMAT_GDAL["RSW"] = GDALDriver(
    "RMF",
    "rsw",
    options=(
        "COMPRESS=LZW",
        "RMFHUGE=IF_SAFER",
    ),
    mime=None,
)

GDAL_DRIVER_NAME_2_EXPORT_FORMATS = [
    {
        "name": format.name,
        "extension": format.extension,
    }
    for _, format in EXPORT_FORMAT_GDAL.items()
]
