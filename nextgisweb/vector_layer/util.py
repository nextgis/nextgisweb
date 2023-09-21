from nextgisweb.env import COMP_ID
from nextgisweb.lib import db
from nextgisweb.lib.ogrhelper import read_dataset

from nextgisweb.feature_layer import FIELD_TYPE, FIELD_TYPE_OGR, GEOM_TYPE

SCHEMA = COMP_ID


class DRIVERS:
    ESRI_SHAPEFILE = "ESRI Shapefile"
    GPKG = "GPKG"
    GEOJSON = "GeoJSON"
    KML = "KML"
    LIBKML = "LIBKML"
    GML = "GML"
    MAPINFO_FILE = "MapInfo File"

    enum = (ESRI_SHAPEFILE, GPKG, GEOJSON, KML, LIBKML, GML, MAPINFO_FILE)


class ERROR_FIX:
    NONE = "NONE"
    SAFE = "SAFE"
    LOSSY = "LOSSY"

    default = NONE
    enum = (NONE, SAFE, LOSSY)


class FID_SOURCE:
    AUTO = "AUTO"
    SEQUENCE = "SEQUENCE"
    FIELD = "FIELD"


class TOGGLE:
    AUTO = None
    YES = True
    NO = False

    enum = (AUTO, YES, NO)


FIELD_TYPE_2_ENUM = dict(zip(FIELD_TYPE_OGR, FIELD_TYPE.enum))
FIELD_TYPE_DB = (db.Integer, db.BigInteger, db.Float, db.Unicode, db.Date, db.Time, db.DateTime)
FIELD_TYPE_2_DB = dict(zip(FIELD_TYPE.enum, FIELD_TYPE_DB))
FIELD_TYPE_SIZE = {
    FIELD_TYPE.INTEGER: 4,
    FIELD_TYPE.BIGINT: 8,
    FIELD_TYPE.REAL: 8,
    FIELD_TYPE.DATE: 4,
    FIELD_TYPE.TIME: 8,
    FIELD_TYPE.DATETIME: 8,
}

GEOM_TYPE_DB = (
    "POINT",
    "LINESTRING",
    "POLYGON",
    "MULTIPOINT",
    "MULTILINESTRING",
    "MULTIPOLYGON",
    "POINTZ",
    "LINESTRINGZ",
    "POLYGONZ",
    "MULTIPOINTZ",
    "MULTILINESTRINGZ",
    "MULTIPOLYGONZ",
)
GEOM_TYPE_2_DB = dict(zip(GEOM_TYPE.enum, GEOM_TYPE_DB))


def read_dataset_vector(filename, **kw):
    return read_dataset(
        filename,
        allowed_drivers=DRIVERS.enum,
        open_options=("EXPOSE_FID=NO",),
        **kw,
    )


def test_encoding(s):
    try:
        s.encode("utf-8")
    except UnicodeEncodeError:
        return False
    else:
        return True


def fix_encoding(s):
    while not test_encoding(s):
        s = s[:-1]
    return s


def utf8len(s):
    return len(s.encode("utf-8"))
