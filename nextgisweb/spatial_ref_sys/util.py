from osgeo import osr

from ..core.exception import ValidationError

from ..lib.i18n import trstr_factory

COMP_ID = "spatial_ref_sys"
_ = trstr_factory(COMP_ID)

MI_UNIT_ALIASES = {
    0: "mi",
    1: "km",
    2: "in",
    3: "ft",
    4: "yd",
    5: "mm",
    6: "cm",
    7: "m",
    8: "survey ft",
    9: "nmi",
    30: "li",
    31: "ch",
    32: "rd"
}


def normalize_mapinfo_cs(source):
    source = source.replace("Earth Projection", "").strip()
    items = source.split(", ")
    unit_index = 2

    if len(items) > unit_index and items[unit_index].isdigit():
        unit = items[unit_index]
        unit = MI_UNIT_ALIASES[int(unit)]
        if unit:
            items[unit_index] = "\"%s\"" % unit
        else:
            raise ValidationError(
                message=_("Invalid MapInfo spatial reference system: %s") % source)
    if len(items) == 8:
        items.append("0")
    return "Earth Projection " + ", ".join(items)


def convert_to_wkt(source, format=None, pretty=False):
    sr = osr.SpatialReference()

    if format == 'proj4':
        sr.ImportFromProj4(source)
    elif format == 'epsg':
        sr.ImportFromEPSG(int(source))
    elif format == 'esri':
        sr.ImportFromESRI([source])
    elif format == 'mapinfo':
        sr.ImportFromMICoordSys(normalize_mapinfo_cs(source))
    elif format == 'wkt':
        sr.ImportFromWkt(source)
    else:
        raise ValidationError(
            message=_("Unknown spatial reference system format: %s!") % format)

    wkt = sr.ExportToPrettyWkt() if pretty else sr.ExportToWkt()
    return wkt


def convert_to_proj(source):
    sr = osr.SpatialReference()
    if sr.ImportFromWkt(source) != 0:
        raise ValidationError(
            message=_("Invalid OGC WKT definition!"))
    return sr.ExportToProj4()
