import pytest
import transaction

from ...lib.geometry import Geometry
from ...models import DBSession

from ..model import SRS

MOSCOW_VLADIVOSTOK = 'LINESTRING(37.62 55.75,131.9 43.12)'
LENGTH_SPHERE = 6434561.600305
LENGTH_FLAT = 10718924.816779


@pytest.fixture(scope='module')
def srs_ids():
    with transaction.manager:
        obj = SRS(
            display_name="MSK23",
            wkt='PROJCS["МСК 23 зона 1",GEOGCS["GCS_Pulkovo_1942",DATUM["Pulkovo_1942",SPHEROID["Krassowsky_1940",6378245.0,298.3]],PRIMEM["Greenwich",0.0],UNIT["Degree",0.0174532925199433]],PROJECTION["Transverse_Mercator"],PARAMETER["False_Easting",1300000.0],PARAMETER["False_Northing",-4511057.628],PARAMETER["Central_Meridian",37.98333333333],PARAMETER["Scale_Factor",1.0],PARAMETER["Latitude_Of_Origin",0.0],UNIT["Meter",1.0]]',  # NOQA: E501
        ).persist()
        DBSession.flush()
        DBSession.expunge(obj)

    yield {
        "EPSG:4326": 4326,
        "EPSG:3857": 3857,
        "MSK": obj.id
    }

    with transaction.manager:
        DBSession.delete(SRS.filter_by(id=obj.id).one())


def test_geom_transform(ngw_webtest_app):
    result = ngw_webtest_app.post_json(
        "/api/component/spatial_ref_sys/%d/geom_transform" % 3857,
        dict(geom=MOSCOW_VLADIVOSTOK, srs=4326)
    )
    g1 = Geometry.from_wkt(result.json["geom"])
    g2 = Geometry.from_wkt("LINESTRING(4187839.2436 7508807.8513,14683040.8356 5330254.9437)")
    assert g2.shape.equals_exact(g1.shape, 5e-05)

    result = ngw_webtest_app.post_json(
        "/api/component/spatial_ref_sys/%d/geom_transform" % 4326,
        dict(geom=result.json["geom"], srs=3857)
    )
    g1 = Geometry.from_wkt(result.json["geom"])
    g2 = Geometry.from_wkt(MOSCOW_VLADIVOSTOK)
    assert g2.shape.equals_exact(g1.shape, 5e-07)


def test_geom_length(ngw_webtest_app):
    result = ngw_webtest_app.post_json(
        "/api/component/spatial_ref_sys/%d/geom_length" % 4326,
        dict(geom=MOSCOW_VLADIVOSTOK)
    )
    assert abs(result.json["value"] - LENGTH_SPHERE) < 1e-6

    result = ngw_webtest_app.post_json(
        "/api/component/spatial_ref_sys/%d/geom_length" % 4326,
        dict(geom=MOSCOW_VLADIVOSTOK)
    )
    assert abs(result.json["value"] - LENGTH_SPHERE) < 1e-6

    result = ngw_webtest_app.post_json(
        "/api/component/spatial_ref_sys/%d/geom_length" % 3857,
        dict(geom=MOSCOW_VLADIVOSTOK, srs=4326)
    )
    assert abs(result.json["value"] - LENGTH_FLAT) < 1e-6


@pytest.mark.parametrize("wkt, srs_geom, srs_calc, area", [
    pytest.param(
        'POLYGON((484000 1400000, 484000 1400100, 484100 1400100, 484100 1400000, 484000 1400000))',
        'MSK', 'MSK', 10000, id='hectare-cw-msk'),
    pytest.param(
        'POLYGON((484000 1400000, 484100 1400000, 484100 1400100, 484000 1400100, 484000 1400000))',
        'MSK', 'MSK', 10000, id='hectare-ccw-msk'),
    pytest.param(
        'POLYGON((0 1, 1 0, 0 -1, -1 0, 0 1))',
        'EPSG:3857', 'EPSG:4326', -2, id='zero-cw-4326'),
    pytest.param(
        'POLYGON((0 1, -1 0, 0 -1, 1 0, 0 1))',
        'EPSG:3857', 'EPSG:4326', 2, id='zero-ccw-4326'),
    pytest.param(
        'POLYGON((0 1, 1 0, 0 -1, -1 0, 0 1))',
        'EPSG:3857', 'EPSG:3857', 2, id='zero-3857'),
])
def test_geom_area(wkt, srs_geom, srs_calc, area, srs_ids, ngw_webtest_app):
    result = ngw_webtest_app.post_json(
        "/api/component/spatial_ref_sys/%d/geom_area" % srs_ids[srs_calc],
        dict(geom=wkt, srs=srs_ids[srs_geom]))
    assert result.json["value"] == pytest.approx(area, rel=0.025)
