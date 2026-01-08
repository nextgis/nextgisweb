import json
from tempfile import NamedTemporaryFile

import pytest
from osgeo import gdal

from nextgisweb.pyramid.test import WebTestApp

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


def test_export_filter_single_condition(export_geojson):
    filter = ["all", ["==", ["get", "name"], "Alice"]]
    geojson = export_geojson(filter=filter)

    assert len(geojson["features"]) == 1
    assert geojson["features"][0]["properties"]["name"] == "Alice"


def test_export_filter_all_multiple_conditions(export_geojson):
    filter = ["all", ["==", ["get", "city"], "NYC"], [">", ["get", "age"], 26]]
    geojson = export_geojson(filter=filter)

    # Should match Charlie (35, NYC) and Eve (32, NYC), not Alice (25, NYC)
    assert len(geojson["features"]) == 2
    names = {f["properties"]["name"] for f in geojson["features"]}
    assert names == {"Charlie", "Eve"}


def test_export_filter_any_conditions(export_geojson):
    filter = ["any", ["==", ["get", "name"], "Alice"], ["==", ["get", "name"], "Bob"]]
    geojson = export_geojson(filter=filter)

    assert len(geojson["features"]) == 2
    names = {f["properties"]["name"] for f in geojson["features"]}
    assert names == {"Alice", "Bob"}


def test_export_filter_nested_groups(export_geojson):
    filter = [
        "all",
        ["==", ["get", "city"], "NYC"],
        ["any", ["<", ["get", "age"], 27], [">", ["get", "age"], 33]],
    ]
    geojson = export_geojson(filter=filter)

    # Should match: Alice (25, NYC) and Charlie (35, NYC)
    assert len(geojson["features"]) == 2
    names = {f["properties"]["name"] for f in geojson["features"]}
    assert names == {"Alice", "Charlie"}


def test_export_filter_comparison_operators(export_geojson):
    # Greater than
    filter = ["all", [">", ["get", "age"], 30]]
    geojson = export_geojson(filter=filter)
    assert len(geojson["features"]) == 2  # Charlie (35) and Eve (32)

    # Greater or equal
    filter = ["all", [">=", ["get", "score"], 8.0]]
    geojson = export_geojson(filter=filter)
    assert len(geojson["features"]) == 3  # Alice (8.5), Charlie (9.0), Eve (8.0)

    # Less than
    filter = ["all", ["<", ["get", "age"], 30]]
    geojson = export_geojson(filter=filter)
    assert len(geojson["features"]) == 2  # Alice (25) and Diana (28)

    # Not equal
    filter = ["all", ["!=", ["get", "city"], "NYC"]]
    geojson = export_geojson(filter=filter)
    assert len(geojson["features"]) == 2  # Bob (LA) and Diana (SF)


def test_export_filter_in_operator(export_geojson):
    filter = ["all", ["in", ["get", "name"], ["Alice", "Bob", "Charlie"]]]
    geojson = export_geojson(filter=filter)

    assert len(geojson["features"]) == 3
    names = {f["properties"]["name"] for f in geojson["features"]}
    assert names == {"Alice", "Bob", "Charlie"}


def test_export_filter_not_in_operator(export_geojson):
    filter = ["all", ["!in", ["get", "city"], ["NYC", "LA"]]]
    geojson = export_geojson(filter=filter)

    assert len(geojson["features"]) == 1
    assert geojson["features"][0]["properties"]["city"] == "SF"


def test_export_filter_empty_expression(export_geojson):
    filter = []
    geojson = export_geojson(filter=filter)

    # Empty filter should return all features
    assert len(geojson["features"]) == 5


def test_export_filter_invalid_format(test_layer_id, ngw_webtest_app: WebTestApp):
    filter = json.dumps(["unsupported", ["get", "name"], "Alice"])
    qs = dict(format="GeoJSON", srs="3857", zipped="false", filter=filter)

    ngw_webtest_app.get(f"/api/resource/{test_layer_id}/export", query=qs, status=422)


def test_export_filter_invalid_json(test_layer_id, ngw_webtest_app: WebTestApp):
    # Invalid JSON
    qs = dict(format="GeoJSON", srs="3857", zipped="false", filter="not valid json {")

    ngw_webtest_app.get(f"/api/resource/{test_layer_id}/export", query=qs, status=422)


def test_export_filter_unknown_field(test_layer_id, ngw_webtest_app: WebTestApp):
    filter = json.dumps(["all", ["==", ["get", "nonexistent"], "value"]])
    qs = dict(format="GeoJSON", srs="3857", zipped="false", filter=filter)

    ngw_webtest_app.get(f"/api/resource/{test_layer_id}/export", query=qs, status=422)


def test_export_filter_with_ilike(export_geojson, test_layer_id, ngw_webtest_app: WebTestApp):
    # Combine filter with ilike - filter first, then ilike should further filter
    filter = ["all", ["==", ["get", "city"], "NYC"]]
    qs = dict(
        format="GeoJSON",
        srs="3857",
        zipped="false",
        filter=json.dumps(filter),
        ilike="Alice",
    )

    geojson = ngw_webtest_app.get(f"/api/resource/{test_layer_id}/export", query=qs).json

    # Should only match Alice (in NYC and name contains "Alice")
    assert len(geojson["features"]) == 1
    assert geojson["features"][0]["properties"]["name"] == "Alice"


def test_export_filter_with_intersects(export_geojson, test_layer_id, ngw_webtest_app: WebTestApp):
    # Combine filter with intersects geometry
    filter = ["all", [">", ["get", "age"], 25]]
    qs = dict(
        format="GeoJSON",
        srs="3857",
        zipped="false",
        filter=json.dumps(filter),
        intersects="POLYGON((0 0, 0 2, 2 2, 2 0, 0 0))",
        intersects_srs="3857",
    )

    geojson = ngw_webtest_app.get(f"/api/resource/{test_layer_id}/export", query=qs).json

    # Should match features with age > 25 AND within the polygon
    # Bob (30, at 1,1) and Charlie (35, at 2,2) but not Alice (25)
    assert len(geojson["features"]) == 2
    names = {f["properties"]["name"] for f in geojson["features"]}
    assert names == {"Bob", "Charlie"}


def test_export_filter_date_field(export_geojson):
    # Filter by date - people born before 1995
    filter = ["all", ["<", ["get", "birth_date"], "1995-01-01"]]
    geojson = export_geojson(filter=filter)

    # Should match Bob (1993-08-22) and Charlie (1988-12-01)
    assert len(geojson["features"]) == 3
    names = {f["properties"]["name"] for f in geojson["features"]}
    assert names == {"Bob", "Charlie", "Eve"}


def test_export_filter_date_equality(export_geojson):
    # Filter by exact date
    filter = ["all", ["==", ["get", "birth_date"], "1998-05-15"]]
    geojson = export_geojson(filter=filter)

    assert len(geojson["features"]) == 1
    assert geojson["features"][0]["properties"]["name"] == "Alice"


def test_export_filter_datetime_field(export_geojson):
    # Filter by datetime - created after 2023-03-01
    filter = ["all", [">", ["get", "created_at"], "2023-03-01T00:00:00"]]
    geojson = export_geojson(filter=filter)

    # Should match Charlie (2023-03-20) and Eve (2023-04-05)
    assert len(geojson["features"]) == 2
    names = {f["properties"]["name"] for f in geojson["features"]}
    assert names == {"Charlie", "Eve"}


def test_export_filter_datetime_range(export_geojson):
    # Filter by datetime range - created in January 2023
    filter = [
        "all",
        [">=", ["get", "created_at"], "2023-01-01T00:00:00"],
        ["<", ["get", "created_at"], "2023-02-01T00:00:00"],
    ]
    geojson = export_geojson(filter=filter)

    # Should match Alice (2023-01-10) and Diana (2023-01-25)
    assert len(geojson["features"]) == 2
    names = {f["properties"]["name"] for f in geojson["features"]}
    assert names == {"Alice", "Diana"}


def test_export_filter_time_field(export_geojson):
    # Filter by time - work starts before 09:00
    filter = ["all", ["<", ["get", "work_start"], "09:00:00"]]
    geojson = export_geojson(filter=filter)

    # Should match Charlie (08:00:00) and Eve (08:30:00)
    assert len(geojson["features"]) == 2
    names = {f["properties"]["name"] for f in geojson["features"]}
    assert names == {"Charlie", "Eve"}


def test_export_filter_time_equality(export_geojson):
    # Filter by exact time
    filter = ["all", ["==", ["get", "work_start"], "09:00:00"]]
    geojson = export_geojson(filter=filter)

    assert len(geojson["features"]) == 1
    assert geojson["features"][0]["properties"]["name"] == "Alice"


def test_export_filter_mixed_date_and_string(export_geojson):
    # Combine date filter with string filter
    filter = [
        "all",
        ["==", ["get", "city"], "NYC"],
        [">", ["get", "birth_date"], "1990-01-01"],
    ]
    geojson = export_geojson(filter=filter)

    # Should match Alice (NYC, 1998-05-15) and Eve (NYC, 1991-07-18)
    assert len(geojson["features"]) == 2
    names = {f["properties"]["name"] for f in geojson["features"]}
    assert names == {"Alice", "Eve"}


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
