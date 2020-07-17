# -*- coding: utf-8 -*-
from __future__ import division, absolute_import, print_function, unicode_literals
import collections


EXPORT_FORMAT_OGR = collections.OrderedDict()


OGRDriver = collections.namedtuple(
    "OGRDriver",
    [
        "name",
        "display_name",
        "extension",
        "options",
        "mime",
        "single_file",
        "fid_support",
    ],
)

EXPORT_FORMAT_OGR["ESRI Shapefile"] = OGRDriver(
    "ESRI Shapefile",
    "ESRI Shapefile (*.shp)",
    "shp",
    single_file=False,
    fid_support=False,
    options=None,
    mime=None,
)

EXPORT_FORMAT_OGR["GeoJSON"] = OGRDriver(
    "GeoJSON",
    "GeoJSON (*.json)",
    "geojson",
    single_file=True,
    fid_support=True,
    options=None,
    mime="application/json",
)

EXPORT_FORMAT_OGR["CSV"] = OGRDriver(
    "CSV",
    "Comma Separated Value (*.csv)",
    "csv",
    options=(
        "GEOMETRY=AS_WKT",
        "CREATE_CSVT=YES",
        "GEOMETRY_NAME=GEOM",
        "WRITE_BOM=YES",
    ),
    single_file=True,
    fid_support=False,
    mime="text/csv",
)

EXPORT_FORMAT_OGR["DXF"] = OGRDriver(
    "DXF",
    "AutoCAD DXF (*.dxf)",
    "dxf",
    single_file=True,
    fid_support=False,
    options=None,
    mime="application/dxf",
)

EXPORT_FORMAT_OGR["MapInfo File"] = OGRDriver(
    "MapInfo File",
    "MapInfo TAB (*.tab)",
    "tab",
    single_file=False,
    fid_support=False,
    options=None,
    mime=None,
)

OGR_DRIVER_NAME_2_EXPORT_FORMATS = [
    {
        "name": format.name,
        "display_name": format.display_name,
        "single_file": format.single_file,
    }
    for _, format in EXPORT_FORMAT_OGR.items()
]
