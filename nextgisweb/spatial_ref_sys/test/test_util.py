import pytest

from nextgisweb.spatial_ref_sys.util import convert_to_wkt, normalize_mapinfo_cs

WKT_EPSG_4326_MI = 'GEOGCS["unnamed",DATUM["WGS_1984",SPHEROID["WGS 84",6378137,298.257223563],TOWGS84[0,0,0,0,0,0,0]],PRIMEM["Greenwich",0],UNIT["degree",0.0174532925199433]]'  # NOQA: E501


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
            'proj4', '+proj=longlat +ellps=WGS84 +datum=WGS84 +no_defs', (
                'GEOGCS["WGS 84",DATUM["WGS_1984",SPHEROID["WGS 84",6378137,298.257223563,AUTHORITY["EPSG","7030"]],AUTHORITY["EPSG","6326"]],PRIMEM["Greenwich",0,AUTHORITY["EPSG","8901"]],UNIT["degree",0.0174532925199433,AUTHORITY["EPSG","9122"]],AUTHORITY["EPSG","4326"]]',  # NOQA: E501
                'GEOGCS["unknown",DATUM["WGS_1984",SPHEROID["WGS 84",6378137,298.257223563,AUTHORITY["EPSG","7030"]],AUTHORITY["EPSG","6326"]],PRIMEM["Greenwich",0,AUTHORITY["EPSG","8901"]],UNIT["degree",0.0174532925199433,AUTHORITY["EPSG","9122"]],AXIS["Longitude",EAST],AXIS["Latitude",NORTH]]',  # NOQA: E501
            ), id='proj4-epsg4326'
        ),
        pytest.param(
            'epsg', '4326', (
                'GEOGCS["WGS 84",DATUM["WGS_1984",SPHEROID["WGS 84",6378137,298.257223563,AUTHORITY["EPSG","7030"]],AUTHORITY["EPSG","6326"]],PRIMEM["Greenwich",0,AUTHORITY["EPSG","8901"]],UNIT["degree",0.0174532925199433,AUTHORITY["EPSG","9122"]],AUTHORITY["EPSG","4326"]]',  # NOQA: E501
                'GEOGCS["WGS 84",DATUM["WGS_1984",SPHEROID["WGS 84",6378137,298.257223563,AUTHORITY["EPSG","7030"]],AUTHORITY["EPSG","6326"]],PRIMEM["Greenwich",0,AUTHORITY["EPSG","8901"]],UNIT["degree",0.0174532925199433,AUTHORITY["EPSG","9122"]],AXIS["Latitude",NORTH],AXIS["Longitude",EAST],AUTHORITY["EPSG","4326"]]',  # NOQA: E501
            ), id='epsg-epsg4326'
        ),
        pytest.param(
            'epsg', '3857', (
                'PROJCS["WGS 84 / World Mercator",GEOGCS["WGS 84",DATUM["WGS_1984",SPHEROID["WGS 84",6378137,298.257223563,AUTHORITY["EPSG","7030"]],AUTHORITY["EPSG","6326"]],PRIMEM["Greenwich",0,AUTHORITY["EPSG","8901"]],UNIT["degree",0.0174532925199433,AUTHORITY["EPSG","9122"]],AUTHORITY["EPSG","4326"]],PROJECTION["Mercator_1SP"],PARAMETER["central_meridian",0],PARAMETER["scale_factor",1],PARAMETER["false_easting",0],PARAMETER["false_northing",0],UNIT["metre",1,AUTHORITY["EPSG","9001"]],AXIS["Easting",EAST],AXIS["Northing",NORTH],AUTHORITY["EPSG","3395"]]',  # NOQA: E501
                'PROJCS["WGS 84 / Pseudo-Mercator",GEOGCS["WGS 84",DATUM["WGS_1984",SPHEROID["WGS 84",6378137,298.257223563,AUTHORITY["EPSG","7030"]],AUTHORITY["EPSG","6326"]],PRIMEM["Greenwich",0,AUTHORITY["EPSG","8901"]],UNIT["degree",0.0174532925199433,AUTHORITY["EPSG","9122"]],AUTHORITY["EPSG","4326"]],PROJECTION["Mercator_1SP"],PARAMETER["central_meridian",0],PARAMETER["scale_factor",1],PARAMETER["false_easting",0],PARAMETER["false_northing",0],UNIT["metre",1,AUTHORITY["EPSG","9001"]],AXIS["X",EAST],AXIS["Y",NORTH],EXTENSION["PROJ4","+proj=merc +a=6378137 +b=6378137 +lat_ts=0.0 +lon_0=0.0 +x_0=0.0 +y_0=0 +k=1.0 +units=m +nadgrids=@null +wktext +no_defs"],AUTHORITY["EPSG","3857"]]',  # NOQA: E501
                'PROJCS["WGS 84 / Pseudo-Mercator",GEOGCS["WGS 84",DATUM["WGS_1984",SPHEROID["WGS 84",6378137,298.257223563,AUTHORITY["EPSG","7030"]],AUTHORITY["EPSG","6326"]],PRIMEM["Greenwich",0,AUTHORITY["EPSG","8901"]],UNIT["degree",0.0174532925199433,AUTHORITY["EPSG","9122"]],AUTHORITY["EPSG","4326"]],PROJECTION["Mercator_1SP"],PARAMETER["central_meridian",0],PARAMETER["scale_factor",1],PARAMETER["false_easting",0],PARAMETER["false_northing",0],UNIT["metre",1,AUTHORITY["EPSG","9001"]],AXIS["Easting",EAST],AXIS["Northing",NORTH],EXTENSION["PROJ4","+proj=merc +a=6378137 +b=6378137 +lat_ts=0 +lon_0=0 +x_0=0 +y_0=0 +k=1 +units=m +nadgrids=@null +wktext +no_defs"],AUTHORITY["EPSG","3857"]]',  # NOQA: E501
            ), id='epsg-epsg3857'
        ),
        pytest.param(
            'mapinfo', 'Earth Projection 1, 104', (
                'GEOGCS["unnamed",DATUM["WGS_1984",SPHEROID["WGS 84",6378137,298.257223563],TOWGS84[0,0,0,0,0,0,0]],PRIMEM["Greenwich",0],UNIT["degree",0.0174532925199433]]',  # NOQA: E501
                'GEOGCS["unnamed",DATUM["WGS_1984",SPHEROID["WGS 84",6378137,298.257223563]],PRIMEM["Greenwich",0],UNIT["degree",0.0174532925199433,AUTHORITY["EPSG","9122"]],AXIS["Latitude",NORTH],AXIS["Longitude",EAST]]',  # NOQA: E501
            ), id='mapinfo-epsg4326'
        ),
        pytest.param(
            'esri', 'PROJCS["PS Test",GEOGCS["GCS_WGS_1984",DATUM["D_WGS_1984",SPHEROID["WGS_1984",6378137,298.2572235629972]],PRIMEM["Greenwich",0],UNIT["Degree",0.017453292519943295]],PROJECTION["Stereographic_South_Pole"],PARAMETER["standard_parallel_1",-80.2333],PARAMETER["central_meridian",171],PARAMETER["scale_factor",0.9999],PARAMETER["false_easting",0],PARAMETER["false_northing",0],UNIT["Meter",1]]',  # NOQA: E501
            (
                'PROJCS["PS Test",GEOGCS["GCS_WGS_1984",DATUM["WGS_1984",SPHEROID["WGS_84",6378137,298.2572235629972]],PRIMEM["Greenwich",0],UNIT["Degree",0.017453292519943295]],PROJECTION["Polar_Stereographic"],PARAMETER["latitude_of_origin",-80.2333],PARAMETER["central_meridian",171],PARAMETER["scale_factor",0.9999],PARAMETER["false_easting",0],PARAMETER["false_northing",0],UNIT["Meter",1]]',  # NOQA: E501
                'PROJCS["PS Test",GEOGCS["WGS 84",DATUM["WGS_1984",SPHEROID["WGS 84",6378137,298.257223562997,AUTHORITY["EPSG","7030"]],AUTHORITY["EPSG","6326"]],PRIMEM["Greenwich",0],UNIT["Degree",0.0174532925199433]],PROJECTION["Polar_Stereographic"],PARAMETER["latitude_of_origin",-80.2333],PARAMETER["central_meridian",171],PARAMETER["false_easting",0],PARAMETER["false_northing",0],UNIT["metre",1,AUTHORITY["EPSG","9001"]],AXIS["Easting",NORTH],AXIS["Northing",NORTH]]',  # NOQA: E501
            ), id='esri-pstest'
        ),
        pytest.param(
            'esri', 'PROJCS["МСК 23 зона 1",GEOGCS["GCS_Pulkovo_1942",DATUM["D_Pulkovo_1942",SPHEROID["Krasovsky_1940",6378245.0,298.3]],PRIMEM["Greenwich",0.0],UNIT["Degree",0.0174532925199433]],PROJECTION["Gauss_Kruger"],PARAMETER["False_Easting",1300000.0],PARAMETER["False_Northing",-4511057.628],PARAMETER["Central_Meridian",37.98333333333],PARAMETER["Scale_Factor",1.0],PARAMETER["Latitude_Of_Origin",0.0],UNIT["Meter",1.0]]',  # NOQA: E501
            (
                'PROJCS["МСК 23 зона 1",GEOGCS["GCS_Pulkovo_1942",DATUM["Pulkovo_1942",SPHEROID["Krassowsky_1940",6378245.0,298.3]],PRIMEM["Greenwich",0.0],UNIT["Degree",0.0174532925199433]],PROJECTION["Transverse_Mercator"],PARAMETER["False_Easting",1300000.0],PARAMETER["False_Northing",-4511057.628],PARAMETER["Central_Meridian",37.98333333333],PARAMETER["Scale_Factor",1.0],PARAMETER["Latitude_Of_Origin",0.0],UNIT["Meter",1.0]]',  # NOQA: E501
                'PROJCS["МСК 23 зона 1",GEOGCS["Pulkovo 1942",DATUM["Pulkovo_1942",SPHEROID["Krassowsky 1940",6378245,298.3,AUTHORITY["EPSG","7024"]],AUTHORITY["EPSG","6284"]],PRIMEM["Greenwich",0],UNIT["Degree",0.0174532925199433]],PROJECTION["Transverse_Mercator"],PARAMETER["latitude_of_origin",0],PARAMETER["central_meridian",37.98333333333],PARAMETER["scale_factor",1],PARAMETER["false_easting",1300000],PARAMETER["false_northing",-4511057.628],UNIT["metre",1,AUTHORITY["EPSG","9001"]],AXIS["Easting",EAST],AXIS["Northing",NORTH]]',  # NOQA: E501
            ), id='esri-msk23'
        ),
    ]
)
def test_convert_to_wkt(format, source, expected):
    result = convert_to_wkt(source, format=format)
    assert result in expected
