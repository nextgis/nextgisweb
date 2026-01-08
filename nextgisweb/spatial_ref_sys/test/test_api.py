import pytest
import transaction

from nextgisweb.env import DBSession
from nextgisweb.lib.geometry import Geometry

from nextgisweb.pyramid.test import WebTestApp

from ..model import SRS
from .data import (
    srs_def,
    transform_batch_expected,
    transform_batch_input,
    transform_batch_input_wrong_srs_to,
    wrong_srs_def,
)

MOSCOW_VLADIVOSTOK = "LINESTRING(37.62 55.75,131.9 43.12)"
LENGTH_SPHERE = 6434561.600305
LENGTH_FLAT = 10718924.816779


@pytest.fixture(scope="module")
def srs_ids():
    srs_add = dict()
    with transaction.manager:
        for srs_info in srs_def:
            display_name = srs_info["display_name"]
            obj = SRS(
                display_name=display_name,
                wkt=srs_info["wkt"],
            ).persist()
            DBSession.flush()
            srs_add[display_name] = obj.id

    yield dict({"EPSG:4326": 4326, "EPSG:3857": 3857}, **srs_add)


@pytest.fixture(scope="module")
def wrong_srs_ids():
    srs_wrong = dict()
    with transaction.manager:
        for srs_info in wrong_srs_def:
            display_name = srs_info["display_name"]
            obj = SRS(display_name=display_name, wkt=srs_info["wkt"]).persist()
            DBSession.flush()
            srs_wrong[display_name] = obj.id

    yield srs_wrong


def test_protected(ngw_webtest_app: WebTestApp, ngw_auth_administrator):
    data = dict(wkt=srs_def[0]["wkt"])
    ngw_webtest_app.put("/api/component/spatial_ref_sys/3857", json=data, status=422)


def test_geom_transform(ngw_webtest_app: WebTestApp):
    result = ngw_webtest_app.post(
        "/api/component/spatial_ref_sys/%d/geom_transform" % 3857,
        json={"geom": MOSCOW_VLADIVOSTOK, "srs": 4326},
    )
    g1 = Geometry.from_wkt(result.json["geom"])
    g2 = Geometry.from_wkt("LINESTRING(4187839.2436 7508807.8513,14683040.8356 5330254.9437)")
    assert g2.shape.equals_exact(g1.shape, 5e-05)

    result = ngw_webtest_app.post(
        "/api/component/spatial_ref_sys/%d/geom_transform" % 4326,
        json={"geom": result.json["geom"], "srs": 3857},
    )
    g1 = Geometry.from_wkt(result.json["geom"])
    g2 = Geometry.from_wkt(MOSCOW_VLADIVOSTOK)
    assert g2.shape.equals_exact(g1.shape, 5e-07)


def test_geom_transform_batch(srs_ids, ngw_webtest_app: WebTestApp):
    result = ngw_webtest_app.post(
        "/api/component/spatial_ref_sys/geom_transform",
        json=transform_batch_input(srs_ids),
    ).json

    for i, expected_item in enumerate(transform_batch_expected(srs_ids)):
        actual_item = result[i]
        assert actual_item["srs_id"] == expected_item["srs_id"]
        g_actual = Geometry.from_wkt(actual_item["geom"])
        g_expected = Geometry.from_wkt(expected_item["geom"])
        assert g_expected.shape.equals_exact(g_actual.shape, 5e-03)


def test_geom_transform_batch_return_empty_if_srs_to_wrong(srs_ids, ngw_webtest_app: WebTestApp):
    result = ngw_webtest_app.post(
        "/api/component/spatial_ref_sys/geom_transform",
        json=transform_batch_input_wrong_srs_to(srs_ids),
    ).json

    assert len(result) == 0


def test_return_none_if_calculation_failed(wrong_srs_ids, ngw_webtest_app: WebTestApp):
    result = ngw_webtest_app.post(
        "/api/component/spatial_ref_sys/geom_transform",
        json={
            "geom": "POINT(30 60)",
            "srs_from": 4326,
            "srs_to": [wrong_srs_ids["INVALID_SRS_1"]],
        },
    ).json

    assert len(result) == 1
    assert result[0]["srs_id"] == wrong_srs_ids["INVALID_SRS_1"]
    assert result[0]["geom"] is None


def test_return_none_for_multiple_invalid_srs(wrong_srs_ids, ngw_webtest_app: WebTestApp):
    result = ngw_webtest_app.post(
        "/api/component/spatial_ref_sys/geom_transform",
        json={
            "geom": "POINT(30 60)",
            "srs_from": 4326,
            "srs_to": [
                wrong_srs_ids["INVALID_SRS_1"],
                wrong_srs_ids["INVALID_SRS_2"],
            ],
        },
    ).json

    assert len(result) == 2
    for item in result:
        assert item["srs_id"] in [wrong_srs_ids["INVALID_SRS_1"], wrong_srs_ids["INVALID_SRS_2"]]
        assert item["geom"] is None


def test_mixed_valid_invalid_srs(srs_ids, wrong_srs_ids, ngw_webtest_app: WebTestApp):
    result = ngw_webtest_app.post(
        "/api/component/spatial_ref_sys/geom_transform",
        json={
            "geom": "POINT(30 60)",
            "srs_from": 4326,
            "srs_to": [
                srs_ids["EPSG:3857"],
                wrong_srs_ids["INVALID_SRS_1"],
            ],
        },
    ).json

    assert len(result) == 2
    assert result[0]["srs_id"] == srs_ids["EPSG:3857"]
    assert result[0]["geom"] is not None
    assert result[1]["srs_id"] == wrong_srs_ids["INVALID_SRS_1"]
    assert result[1]["geom"] is None


def test_multiple_different_invalid_srs(wrong_srs_ids, ngw_webtest_app: WebTestApp):
    result = ngw_webtest_app.post(
        "/api/component/spatial_ref_sys/geom_transform",
        json={
            "geom": "POINT(30 60)",
            "srs_from": 4326,
            "srs_to": [
                wrong_srs_ids["INVALID_SRS_1"],
                wrong_srs_ids["INVALID_SRS_2"],
                wrong_srs_ids["INVALID_SRS_3"],
            ],
        },
    ).json

    assert len(result) == 3
    for item in result:
        assert item["geom"] is None
        assert item["srs_id"] in wrong_srs_ids.values()


def test_geom_length(ngw_webtest_app: WebTestApp):
    result = ngw_webtest_app.post(
        "/api/component/spatial_ref_sys/%d/geom_length" % 4326,
        json={"geom": MOSCOW_VLADIVOSTOK},
    )
    assert abs(result.json["value"] - LENGTH_SPHERE) < 1e-6

    result = ngw_webtest_app.post(
        "/api/component/spatial_ref_sys/%d/geom_length" % 4326,
        json={"geom": MOSCOW_VLADIVOSTOK},
    )
    assert abs(result.json["value"] - LENGTH_SPHERE) < 1e-6

    result = ngw_webtest_app.post(
        "/api/component/spatial_ref_sys/%d/geom_length" % 3857,
        json={"geom": MOSCOW_VLADIVOSTOK, "srs": 4326},
    )
    assert abs(result.json["value"] - LENGTH_FLAT) < 1e-6


@pytest.mark.parametrize(
    "wkt, srs_geom, srs_calc, area",
    [
        pytest.param(
            "POLYGON((0 1, 1 0, 0 -1, -1 0, 0 1))", "EPSG:3857", "EPSG:4326", -2, id="zero-cw-4326"
        ),
        pytest.param(
            "POLYGON((0 1, -1 0, 0 -1, 1 0, 0 1))", "EPSG:3857", "EPSG:4326", 2, id="zero-ccw-4326"
        ),
        pytest.param(
            "POLYGON((0 1, 1 0, 0 -1, -1 0, 0 1))", "EPSG:3857", "EPSG:3857", 2, id="zero-3857"
        ),
    ],
)
def test_geom_area(wkt, srs_geom, srs_calc, area, srs_ids, ngw_webtest_app: WebTestApp):
    result = ngw_webtest_app.post(
        "/api/component/spatial_ref_sys/%d/geom_area" % srs_ids[srs_calc],
        json={"geom": wkt, "srs": srs_ids[srs_geom]},
    )
    assert result.json["value"] == pytest.approx(area, rel=0.025)
