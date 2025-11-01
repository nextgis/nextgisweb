import json

import pytest

pytestmark = pytest.mark.usefixtures("ngw_resource_defaults", "ngw_auth_administrator")


@pytest.fixture(scope="module")
def test_layer_id(feature_layer_filter_dataset):
    return feature_layer_filter_dataset


def test_count_no_filters(ngw_webtest_app, test_layer_id):
    resp = ngw_webtest_app.get(f"/api/resource/{test_layer_id}/feature_count")
    assert resp.json["total_count"] == 5
    assert "filtered_count" not in resp.json


def test_count_with_filter_expression(ngw_webtest_app, test_layer_id):
    filter = json.dumps(["all", ["==", ["get", "name"], "Alice"]])
    resp = ngw_webtest_app.get(f"/api/resource/{test_layer_id}/feature_count", {"filter": filter})
    assert resp.json["total_count"] == 5
    assert resp.json["filtered_count"] == 1


def test_count_with_filter_expression_multiple(ngw_webtest_app, test_layer_id):
    filter = json.dumps(["all", ["==", ["get", "city"], "NYC"], [">", ["get", "age"], 26]])
    resp = ngw_webtest_app.get(f"/api/resource/{test_layer_id}/feature_count", {"filter": filter})
    assert resp.json["total_count"] == 5
    assert resp.json["filtered_count"] == 2


def test_count_with_filter_expression_no_matches(ngw_webtest_app, test_layer_id):
    filter = json.dumps(["all", ["==", ["get", "name"], "Nonexistent"]])
    resp = ngw_webtest_app.get(f"/api/resource/{test_layer_id}/feature_count", {"filter": filter})
    assert resp.json["total_count"] == 5
    assert resp.json["filtered_count"] == 0


def test_count_with_field_filter_eq(ngw_webtest_app, test_layer_id):
    resp = ngw_webtest_app.get(
        f"/api/resource/{test_layer_id}/feature_count", {"fld_name__eq": "Alice"}
    )
    assert resp.json["total_count"] == 5
    assert resp.json["filtered_count"] == 1


def test_count_with_field_filter_gt(ngw_webtest_app, test_layer_id):
    resp = ngw_webtest_app.get(
        f"/api/resource/{test_layer_id}/feature_count", {"fld_age__gt": "30"}
    )
    assert resp.json["total_count"] == 5
    assert resp.json["filtered_count"] == 2


def test_count_with_id_filter(ngw_webtest_app, test_layer_id):
    resp = ngw_webtest_app.get(f"/api/resource/{test_layer_id}/feature_count", {"id": "1"})
    assert resp.json["total_count"] == 5
    assert resp.json["filtered_count"] == 1


def test_count_with_id_filter_range(ngw_webtest_app, test_layer_id):
    resp = ngw_webtest_app.get(
        f"/api/resource/{test_layer_id}/feature_count", {"id__ge": "1", "id__le": "3"}
    )
    assert resp.json["total_count"] == 5
    assert resp.json["filtered_count"] == 3


def test_count_with_like_filter(ngw_webtest_app, test_layer_id):
    resp = ngw_webtest_app.get(f"/api/resource/{test_layer_id}/feature_count", {"like": "Al"})
    assert resp.json["total_count"] == 5
    assert "filtered_count" in resp.json


def test_count_with_intersects_get(ngw_webtest_app, test_layer_id):
    wkt = "POLYGON((0.5 0.5, 0.5 1.5, 1.5 1.5, 1.5 0.5, 0.5 0.5))"
    resp = ngw_webtest_app.get(f"/api/resource/{test_layer_id}/feature_count", {"intersects": wkt})
    assert resp.json["total_count"] == 5
    assert "filtered_count" in resp.json


def test_count_with_multiple_field_filters(ngw_webtest_app, test_layer_id):
    resp = ngw_webtest_app.get(
        f"/api/resource/{test_layer_id}/feature_count",
        {"fld_city__eq": "NYC", "fld_age__gt": "26"},
    )
    assert resp.json["total_count"] == 5
    assert resp.json["filtered_count"] == 2


def test_count_with_filter_expression_and_field_filter(ngw_webtest_app, test_layer_id):
    filter = json.dumps(["all", [">", ["get", "age"], 28]])
    resp = ngw_webtest_app.get(
        f"/api/resource/{test_layer_id}/feature_count",
        {"filter": filter, "fld_city__eq": "NYC"},
    )
    assert resp.json["total_count"] == 5
    assert resp.json["filtered_count"] == 2


def test_count_with_filter_expression_and_intersects(ngw_webtest_app, test_layer_id):
    filter = json.dumps(["all", ["==", ["get", "city"], "NYC"]])
    wkt = "POLYGON((0.5 0.5, 0.5 2.5, 2.5 2.5, 2.5 0.5, 0.5 0.5))"
    resp = ngw_webtest_app.get(
        f"/api/resource/{test_layer_id}/feature_count",
        {"filter": filter, "intersects": wkt},
    )
    assert resp.json["total_count"] == 5
    assert "filtered_count" in resp.json


def test_count_with_all_filter_types(ngw_webtest_app, test_layer_id):
    filter = json.dumps(["all", [">", ["get", "age"], 25]])
    resp = ngw_webtest_app.get(
        f"/api/resource/{test_layer_id}/feature_count",
        {
            "filter": filter,
            "fld_city__eq": "NYC",
            "id__ge": "1",
            "like": "Al",
        },
    )
    assert resp.json["total_count"] == 5
    assert "filtered_count" in resp.json


def test_count_empty_filter_expression(ngw_webtest_app, test_layer_id):
    filter = json.dumps([])
    resp = ngw_webtest_app.get(f"/api/resource/{test_layer_id}/feature_count", {"filter": filter})
    assert resp.json["total_count"] == 5
    assert "filtered_count" not in resp.json


def test_count_filter_expression_any(ngw_webtest_app, test_layer_id):
    filter = json.dumps(["any", ["==", ["get", "name"], "Alice"], ["==", ["get", "name"], "Bob"]])
    resp = ngw_webtest_app.get(f"/api/resource/{test_layer_id}/feature_count", {"filter": filter})
    assert resp.json["total_count"] == 5
    assert resp.json["filtered_count"] == 2


def test_count_filter_expression_complex(ngw_webtest_app, test_layer_id):
    filter = json.dumps(
        [
            "all",
            ["==", ["get", "city"], "NYC"],
            ["any", ["<", ["get", "age"], 27], [">", ["get", "age"], 33]],
        ]
    )
    resp = ngw_webtest_app.get(f"/api/resource/{test_layer_id}/feature_count", {"filter": filter})
    assert resp.json["total_count"] == 5
    assert resp.json["filtered_count"] == 2
