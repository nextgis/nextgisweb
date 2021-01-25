# -*- coding: utf-8 -*-
from __future__ import division, absolute_import, print_function, unicode_literals
import collections

from osgeo import ogr
from six import ensure_str


def get_driver_by_name(name):
    return ogr.GetDriverByName(ensure_str(name))


def test_driver_capability(name, capability):
    driver = get_driver_by_name(name)
    return driver.TestCapability(capability)


EXPORT_FORMAT_OGR = collections.OrderedDict()


OGRDriverT = collections.namedtuple(
    "OGRDriver",
    [
        "name",
        "display_name",
        "extension",
        "options",
        "mime",
        "single_file",
        "fid_support",
        "lco_configurable",
        "dsco_configurable",
    ],
)

def OGRDriver(
    name,
    display_name,
    extension,
    options=None,
    mime=None,
    single_file=True,
    fid_support=False,
    lco_configurable=None,
    dsco_configurable=None,
):
    return OGRDriverT(
        name,
        display_name,
        extension,
        options,
        mime,
        single_file,
        fid_support,
        lco_configurable,
        dsco_configurable,
    )

EXPORT_FORMAT_OGR["ESRI Shapefile"] = OGRDriver(
    "ESRI Shapefile",
    "ESRI Shapefile (*.shp)",
    "shp",
    single_file=False,
)

EXPORT_FORMAT_OGR["GeoJSON"] = OGRDriver(
    "GeoJSON",
    "GeoJSON (*.json)",
    "geojson",
    single_file=True,
    fid_support=True,
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
        "SEPARATOR=COMMA",
    ),
    single_file=True,
    mime="text/csv",
)

EXPORT_FORMAT_OGR["CSV_MSEXCEL"] = OGRDriver(
    "CSV",
    "CSV for Microsoft Excel (*.csv)",
    "csv",
    options=(
        "GEOMETRY=AS_WKT",
        "CREATE_CSVT=YES",
        "GEOMETRY_NAME=GEOM",
        "WRITE_BOM=YES",
        "SEPARATOR=SEMICOLON",
    ),
    single_file=True,
    mime="text/csv",
)

EXPORT_FORMAT_OGR["DXF"] = OGRDriver(
    "DXF",
    "AutoCAD DXF (*.dxf)",
    "dxf",
    single_file=True,
    mime="application/dxf",
)

EXPORT_FORMAT_OGR["MapInfo File (TAB)"] = OGRDriver(
    "MapInfo File",
    "MapInfo TAB (*.tab)",
    "tab",
    single_file=False,
)

EXPORT_FORMAT_OGR["MapInfo File (MIF/MID)"] = OGRDriver(
    "MapInfo File",
    "MapInfo MIF/MID (*.mif/*.mid)",
    "mif",
    single_file=False,
)

EXPORT_FORMAT_OGR["GPKG"] = OGRDriver(
    "GPKG",
    "GeoPackage (*.gpkg)",
    "gpkg",
    single_file=True,
    fid_support=True,
    mime="application/geopackage+vnd.sqlite3",
)

EXPORT_FORMAT_OGR["SXF"] = OGRDriver(
    "SXF",
    "Storage and eXchange Format (*.sxf)",
    "sxf",
    single_file=False,
    options=("SXF_NEW_BEHAVIOR=YES",),
    dsco_configurable=("SXF_MAP_SCALE:1000000", "SXF_MAP_NAME", "SXF_SHEET_KEY"),
)


OGR_DRIVER_NAME_2_EXPORT_FORMATS = [
    {
        "name": format_id,
        "display_name": format.display_name,
        "single_file": format.single_file,
        "lco_configurable": format.lco_configurable,
        "dsco_configurable": format.dsco_configurable,
    }
    for format_id, format in EXPORT_FORMAT_OGR.items()
    if test_driver_capability(format.name, ogr.ODrCCreateDataSource)
]

MVT_DRIVER_NAME = "MVT"
MVT_DRIVER_EXIST = (get_driver_by_name(MVT_DRIVER_NAME) is not None) and \
                   test_driver_capability(MVT_DRIVER_NAME,
                                          ogr.ODrCCreateDataSource)
