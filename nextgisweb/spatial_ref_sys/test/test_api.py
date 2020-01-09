# -*- coding: utf-8 -*-
from __future__ import division, absolute_import, print_function, unicode_literals

import pytest
import transaction

from nextgisweb.models import DBSession

from nextgisweb.spatial_ref_sys.models import SRS
from nextgisweb.geometry import geom_from_wkt

MOSCOW_VLADIVOSTOK = 'LINESTRING(55.75 37.62,43.12 131.9)'
LENGTH_SPHERE = 6434561.600305
LENGTH_FLAT = 10718924.816779


@pytest.fixture(scope='module')
def srs_msk23_id():
    with transaction.manager:
        obj = SRS(
            display_name="MSK23",
            wkt='PROJCS["МСК 23 зона 1",GEOGCS["GCS_Pulkovo_1942",DATUM["Pulkovo_1942",SPHEROID["Krassowsky_1940",6378245.0,298.3]],PRIMEM["Greenwich",0.0],UNIT["Degree",0.0174532925199433]],PROJECTION["Transverse_Mercator"],PARAMETER["False_Easting",1300000.0],PARAMETER["False_Northing",-4511057.628],PARAMETER["Central_Meridian",37.98333333333],PARAMETER["Scale_Factor",1.0],PARAMETER["Latitude_Of_Origin",0.0],UNIT["Meter",1.0]]',  # NOQA: E501
        ).persist()
        DBSession.flush()
        DBSession.expunge(obj)

    yield obj.id

    with transaction.manager:
        DBSession.delete(SRS.filter_by(id=obj.id).one())


def test_geom_transform(webapp, srs_msk23_id):
    result = webapp.post_json(
        "/api/component/spatial_ref_sys/%d/geom_transform" % 3857,
        dict(geom=MOSCOW_VLADIVOSTOK, srs=4326)
    )
    g1 = geom_from_wkt(result.json["geom"])
    g2 = geom_from_wkt("LINESTRING(4187839.2436 7508807.8513,14683040.8356 5330254.9437)")
    assert g2.almost_equals(g1, 4)

    result = webapp.post_json(
        "/api/component/spatial_ref_sys/%d/geom_transform" % 4326,
        dict(geom=result.json["geom"], srs=3857)
    )
    g1 = geom_from_wkt(result.json["geom"])
    g2 = geom_from_wkt(MOSCOW_VLADIVOSTOK)
    assert g2.almost_equals(g1, 6)


def test_geom_length(webapp, srs_msk23_id):
    result = webapp.post_json(
        "/api/component/spatial_ref_sys/%d/geom_length" % 4326,
        dict(geom=MOSCOW_VLADIVOSTOK)
    )
    assert abs(result.json["value"] - LENGTH_SPHERE) < 1e-6

    result = webapp.post_json(
        "/api/component/spatial_ref_sys/%d/geom_length" % 4326,
        dict(geom=MOSCOW_VLADIVOSTOK)
    )
    assert abs(result.json["value"] - LENGTH_SPHERE) < 1e-6

    result = webapp.post_json(
        "/api/component/spatial_ref_sys/%d/geom_length" % 3857,
        dict(geom=MOSCOW_VLADIVOSTOK, srs=4326)
    )
    assert abs(result.json["value"] - LENGTH_FLAT) < 1e-6


def test_geom_area(webapp, srs_msk23_id):
    POLY = 'POLYGON((484000 1400000,484000 1400100,484100 1400100,484100 1400000,484000 1400000))'
    result = webapp.post_json(
        "/api/component/spatial_ref_sys/%d/geom_area" % srs_msk23_id,
        dict(geom=POLY)
    )
    assert abs(result.json["value"] - 10000) < 1e-6
