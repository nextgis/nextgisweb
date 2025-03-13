from collections import namedtuple

from osgeo import ogr


def get_driver_by_name(name):
    return ogr.GetDriverByName(name)


def test_driver_capability(name, capability):
    driver = get_driver_by_name(name)
    return (driver is not None) and driver.TestCapability(capability)


EXPORT_FORMAT_OGR = dict()


OGRDriverT = namedtuple(
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
        "get_layer_name",
    ],
)


def OGRDriver(
    name,
    display_name,
    extension,
    options=None,
    mime="application/octet-stream",
    single_file=True,
    fid_support=False,
    lco_configurable=None,
    dsco_configurable=None,
    get_layer_name=lambda x: x,
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
        get_layer_name,
    )


def layer_name_gpkg(name):
    if name[0] in r"`~!@#$%^&*()+-={}|[]\\:\";'<>?,./" or name[:4] == "gpkg":
        return f"_{name}"
    return name


EXPORT_FORMAT_OGR["GPKG"] = OGRDriver(
    "GPKG",
    "GeoPackage (*.gpkg)",
    "gpkg",
    single_file=True,
    fid_support=True,
    mime="application/geopackage+vnd.sqlite3",
    get_layer_name=layer_name_gpkg,
)

EXPORT_FORMAT_OGR["GeoJSON"] = OGRDriver(
    "GeoJSON",
    "GeoJSON (*.geojson)",
    "geojson",
    single_file=True,
    fid_support=True,
    mime="application/json",
)

EXPORT_FORMAT_OGR["ESRI Shapefile"] = OGRDriver(
    "ESRI Shapefile",
    "ESRI Shapefile (*.shp)",
    "shp",
    single_file=False,
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

EXPORT_FORMAT_OGR["KML"] = OGRDriver(
    "LIBKML",
    "KML (*.kml)",
    "kml",
    single_file=True,
    mime="application/vnd.google-earth.kml+xml",
)

EXPORT_FORMAT_OGR["KMZ"] = OGRDriver(
    "LIBKML",
    "KMZ (*.kmz)",
    "kmz",
    single_file=True,
    mime="application/vnd.google-earth.kmz",
)

EXPORT_FORMAT_OGR["DXF"] = OGRDriver(
    "DXF",
    "AutoCAD DXF (*.dxf)",
    "dxf",
    single_file=True,
    mime="application/dxf",
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
MVT_DRIVER_EXIST = (get_driver_by_name(MVT_DRIVER_NAME) is not None) and test_driver_capability(
    MVT_DRIVER_NAME, ogr.ODrCCreateDataSource
)
