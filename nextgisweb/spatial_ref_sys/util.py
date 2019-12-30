# -*- coding: utf-8 -*-
from __future__ import unicode_literals
from ..i18n import trstring_factory
from osgeo import osr

COMP_ID = "spatial_ref_sys"
_ = trstring_factory(COMP_ID)

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


def update_MI_coord_sys_string(str):
    str = str.replace("Earth Projection", "")
    str = str.strip()
    items = str.split(", ")
    unit_index = 2

    if len(items) > unit_index and items[unit_index].isdigit():
        unit = items[unit_index]
        unit = MI_UNIT_ALIASES[int(unit)]
        if unit:
            items[unit_index] = "\"%s\"" % unit
        else:
            raise Exception("MI coord string is not valid")
    if len(items) == 8:
        items.append("0")
    return "Earth Projection " + ", ".join(items)


def convert_projstr_to_wkt(proj_str, format=None, pretty=False):
    proj_str = proj_str.encode("utf-8")
    sr = osr.SpatialReference()
    wkt = ""
    imports = [
        ["proj4", "ImportFromProj4"],
        ["epsg", lambda x: sr.ImportFromEPSG(int(x))],
        ["mapinfo", lambda x: sr.ImportFromMICoordSys(
            update_MI_coord_sys_string(x).encode("utf-8"))],
        ["esri", lambda x: sr.ImportFromESRI([proj_str.decode("utf-8")])],
        ["wkt", "ImportFromWkt"]
    ]

    for imp in imports:
        format_, method = imp

        if format and not format_ == format:
            continue

        if hasattr(method, "__call__"):
            method_to_call = method
        else:
            method_to_call = getattr(sr, method)
        try:
            if method_to_call and method_to_call(proj_str) == 0:
                wkt = sr.ExportToPrettyWkt() if pretty else sr.ExportToWkt()
                break
        except:
            pass

    return wkt
