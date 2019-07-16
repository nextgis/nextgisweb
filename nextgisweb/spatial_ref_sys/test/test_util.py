# -*- coding: utf-8 -*-
from __future__ import print_function, unicode_literals

from nextgisweb.spatial_ref_sys.util import convert_projstr_to_wkt, update_MI_coord_sys_string
from osgeo import osr


def test_update_MI_coord_sys_string():
    errors = []
    tests = [
        {
            "standard": 'Earth Projection 8, 1001, "m", 37.98333333333, 0, 1, 1300000, -4511057.628, 0',
            "variants": [
                '8, 1001, "m", 37.98333333333, 0, 1, 1300000, -4511057.628',
                '8, 1001, "m", 37.98333333333, 0, 1, 1300000, -4511057.628, 0',
                '8, 1001, 7, 37.98333333333, 0, 1, 1300000, -4511057.628',
                'Earth Projection 8, 1001, 7, 37.98333333333, 0, 1, 1300000, -4511057.628, 0',
                'Earth Projection 8, 1001, 7, 37.98333333333, 0, 1, 1300000, -4511057.628'
            ]
        },
        {
            "standard": 'Earth Projection 1, 104',
            "variants": [
                'Earth Projection 1, 104',
                '1, 104'
            ]
        }
    ]

    for t in tests:
        standard = t["standard"]
        for v in t["variants"]:
            check = update_MI_coord_sys_string(v)
            if standard != check:
                errors.append("%s != %s" % (standard, check))

    assert not errors, "errors occured:\n{}".format("\n".join(errors))


def test_convert_projstr_to_wkt():
    errors = []
    test_epsg = 4326
    sr = osr.SpatialReference()
    sr.ImportFromEPSG(test_epsg)

    wkt = sr.ExportToWkt()

    # method and control
    # if no control use wkt
    exports = [
        ["proj4", "ExportToProj4"],
        ["mapinfo", "ExportToMICoordSys", 'GEOGCS["unnamed",DATUM["WGS_1984",SPHEROID["WGS 84",6378137,298.257223563],TOWGS84[0,0,0,0,0,0,0]],PRIMEM["Greenwich",0],UNIT["degree",0.0174532925199433]]'],
        ["epsg", lambda: str(test_epsg)]
    ]

    def test_exports(with_format_def=False):
        for e in exports:
            method_to_call = e[1]
            if not hasattr(method_to_call, "__call__"):
                method_to_call = getattr(sr, method_to_call)

            control = e[2] if len(e) > 2 else wkt
            format = e[0] if with_format_def else None
            proj_string = method_to_call()
            converted_wkt = convert_projstr_to_wkt(proj_string, format=format)
            if converted_wkt != control:
                errors.append("%s != %s" % (converted_wkt, control))

    test_exports()
    test_exports(with_format_def=True)

    assert not errors, "errors occured:\n{}".format("\n".join(errors))
