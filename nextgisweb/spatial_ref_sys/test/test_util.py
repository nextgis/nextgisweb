# -*- coding: utf-8 -*-
from __future__ import division, absolute_import, print_function, unicode_literals

import pytest

from nextgisweb.spatial_ref_sys.models import WKT_ESPG_4326, WKT_ESPG_3857
from nextgisweb.spatial_ref_sys.util import convert_to_wkt, normalize_mapinfo_cs

WKT_ESPG_4326_MI = 'GEOGCS["unnamed",DATUM["WGS_1984",SPHEROID["WGS 84",6378137,298.257223563],TOWGS84[0,0,0,0,0,0,0]],PRIMEM["Greenwich",0],UNIT["degree",0.0174532925199433]]'  # NOQA: E501


@pytest.mark.parametrize(
    'expected, variants',
    [
        pytest.param(
            'Earth Projection 1, 104', (
                'Earth Projection 1, 104',
                '1, 104',
            ), id="1"
        ),
        pytest.param(
            'Earth Projection 8, 1001, "m", 37.98333333333, 0, 1, 1300000, -4511057.628, 0', (
                '8, 1001, "m", 37.98333333333, 0, 1, 1300000, -4511057.628',
                '8, 1001, "m", 37.98333333333, 0, 1, 1300000, -4511057.628, 0',
                '8, 1001, 7, 37.98333333333, 0, 1, 1300000, -4511057.628',
                'Earth Projection 8, 1001, 7, 37.98333333333, 0, 1, 1300000, -4511057.628, 0',
                'Earth Projection 8, 1001, 7, 37.98333333333, 0, 1, 1300000, -4511057.628',
            ), id="8"
        ),
    ]
)
def test_normalize_mapinfo_cs(expected, variants):
    for variant in variants:
        assert normalize_mapinfo_cs(variant) == expected


@pytest.mark.parametrize(
    'format, source, expected', [
        pytest.param(
            'proj4', '+proj=longlat +ellps=WGS84 +datum=WGS84 +no_defs',
            WKT_ESPG_4326, id='proj4-epsg4326'
        ),
        pytest.param(
            'epsg', '4326',
            WKT_ESPG_4326, id='epsg-epsg4326'
        ),
        pytest.param(
            'epsg', '3857',
            WKT_ESPG_3857, id='epsg-epsg3857'
        ),
        pytest.param(
            'mapinfo', 'Earth Projection 1, 104', WKT_ESPG_4326_MI,
            id='mapinfo-epsg4326'
        ),
        pytest.param(
            'esri', 'PROJCS["PS Test",GEOGCS["GCS_WGS_1984",DATUM["D_WGS_1984",SPHEROID["WGS_1984",6378137,298.2572235629972]],PRIMEM["Greenwich",0],UNIT["Degree",0.017453292519943295]],PROJECTION["Stereographic_South_Pole"],PARAMETER["standard_parallel_1",-80.2333],PARAMETER["central_meridian",171],PARAMETER["scale_factor",0.9999],PARAMETER["false_easting",0],PARAMETER["false_northing",0],UNIT["Meter",1]]',  # NOQA: E501
            'PROJCS["PS Test",GEOGCS["GCS_WGS_1984",DATUM["WGS_1984",SPHEROID["WGS_84",6378137,298.2572235629972]],PRIMEM["Greenwich",0],UNIT["Degree",0.017453292519943295]],PROJECTION["Polar_Stereographic"],PARAMETER["latitude_of_origin",-80.2333],PARAMETER["central_meridian",171],PARAMETER["scale_factor",0.9999],PARAMETER["false_easting",0],PARAMETER["false_northing",0],UNIT["Meter",1]]',  # NOQA: E501
            id='esri-pstest'
        ),
        pytest.param(
            'esri', 'PROJCS["МСК 23 зона 1",GEOGCS["GCS_Pulkovo_1942",DATUM["D_Pulkovo_1942",SPHEROID["Krasovsky_1940",6378245.0,298.3]],PRIMEM["Greenwich",0.0],UNIT["Degree",0.0174532925199433]],PROJECTION["Gauss_Kruger"],PARAMETER["False_Easting",1300000.0],PARAMETER["False_Northing",-4511057.628],PARAMETER["Central_Meridian",37.98333333333],PARAMETER["Scale_Factor",1.0],PARAMETER["Latitude_Of_Origin",0.0],UNIT["Meter",1.0]]',  # NOQA: E501
            'PROJCS["МСК 23 зона 1",GEOGCS["GCS_Pulkovo_1942",DATUM["Pulkovo_1942",SPHEROID["Krassowsky_1940",6378245.0,298.3]],PRIMEM["Greenwich",0.0],UNIT["Degree",0.0174532925199433]],PROJECTION["Transverse_Mercator"],PARAMETER["False_Easting",1300000.0],PARAMETER["False_Northing",-4511057.628],PARAMETER["Central_Meridian",37.98333333333],PARAMETER["Scale_Factor",1.0],PARAMETER["Latitude_Of_Origin",0.0],UNIT["Meter",1.0]]',  # NOQA: E501
            id='esri-msk23'
        ),
    ]
)
def test_convert_to_wkt(format, source, expected):
    assert convert_to_wkt(source, format=format) == expected
