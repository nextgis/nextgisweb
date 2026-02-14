import json
from tempfile import NamedTemporaryFile

import pytest
from osgeo import gdal

from nextgisweb.pyramid.test import WebTestApp

from .filter_cases import get_integration_cases, get_invalid_filter_cases

pytestmark = pytest.mark.usefixtures("ngw_resource_defaults", "ngw_auth_administrator")


@pytest.fixture(scope="module")
def test_layer_id(feature_layer_filter_dataset):
    return feature_layer_filter_dataset


@pytest.fixture()
def export_geojson(test_layer_id, ngw_webtest_app: WebTestApp):
    def wrapped(filter=None, **kwargs):
        qs = dict(
            format="GeoJSON",
            srs="3857",
            zipped="false",
            **kwargs,
        )
        if filter is not None:
            qs["filter"] = json.dumps(filter)
        resp = ngw_webtest_app.get(f"/api/resource/{test_layer_id}/export", query=qs)
        return resp.json

    return wrapped


@pytest.mark.parametrize("expression, expected_names", get_integration_cases())
def test_export_geojson(export_runner, expression, expected_names):
    assert export_runner.fetch_names(expression) == expected_names


@pytest.mark.parametrize("expression, expected_names", get_integration_cases(only_auto_all=True))
def test_export_geojson_with_all(export_runner, expression, expected_names):
    assert export_runner.fetch_names(["all", expression]) == expected_names


@pytest.fixture(params=[lambda e: e, lambda e: ["all", e]], ids=["raw", "all_wrapped"])
def auto_all(request):
    return request.param


@pytest.mark.parametrize("case", get_invalid_filter_cases())
def test_export_filter_validation_errors(export_runner, auto_all, case):
    expr = auto_all(case.expression) if case.auto_all else case.expression

    resp = export_runner.fetch_response(expr, status=case.export_status)

    if hasattr(case, "error_pattern") and case.error_pattern:
        error_message = resp.json.get("message", str(resp.json))
        assert case.error_pattern.lower() in error_message.lower()


def test_export_filter_empty_expression(export_runner):
    filter_expr = []
    resp = export_runner.fetch_response(filter_expr)
    geojson = resp.json

    assert len(geojson["features"]) == 5


def test_export_filter_with_ilike(export_runner):
    filter_expr = ["all", ["==", ["get", "city"], "NYC"]]
    resp = export_runner.fetch_response(filter_expr, ilike="Alice")
    geojson = resp.json

    assert len(geojson["features"]) == 1
    assert geojson["features"][0]["properties"]["name"] == "Alice"


def test_export_filter_with_intersects(export_runner):
    filter_expr = ["all", [">", ["get", "age"], 25]]
    resp = export_runner.fetch_response(
        filter_expr, intersects="POLYGON((0 0, 0 2, 2 2, 2 0, 0 0))", intersects_srs="3857"
    )
    geojson = resp.json

    assert len(geojson["features"]) == 2
    assert {f["properties"]["name"] for f in geojson["features"]} == {"Bob", "Charlie"}


def test_export_gpkg_with_filter(test_layer_id, ngw_webtest_app: WebTestApp):
    filter = json.dumps(["all", ["==", ["get", "city"], "NYC"]])
    qs = dict(format="GPKG", srs="3857", filter=filter)

    response = ngw_webtest_app.get(
        f"/api/resource/{test_layer_id}/export",
        query=qs,
        status=200,
    )

    with NamedTemporaryFile(suffix=".zip") as t:
        t.write(response.body)
        t.flush()

        ogrfn = f"/vsizip/{t.name}/{test_layer_id}.gpkg"
        ds = gdal.OpenEx(ogrfn, 0)
        assert ds is not None

        layer = ds.GetLayer(0)
        assert layer is not None
        assert layer.GetFeatureCount() == 3  # Alice, Charlie, Eve in NYC


def test_export_shapefile_with_filter(test_layer_id, ngw_webtest_app: WebTestApp):
    filter = json.dumps(["all", [">", ["get", "age"], 30]])
    qs = dict(format="ESRI Shapefile", srs="3857", filter=filter)

    response = ngw_webtest_app.get(
        f"/api/resource/{test_layer_id}/export",
        query=qs,
        status=200,
    )

    with NamedTemporaryFile(suffix=".zip") as t:
        t.write(response.body)
        t.flush()

        ogrfn = f"/vsizip/{t.name}/{test_layer_id}.shp"
        ds = gdal.OpenEx(ogrfn, 0)
        assert ds is not None

        layer = ds.GetLayer(0)
        assert layer is not None
        assert layer.GetFeatureCount() == 2  # Charlie (35) and Eve (32)
