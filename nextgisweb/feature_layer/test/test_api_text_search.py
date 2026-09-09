import pytest
import transaction

from nextgisweb.pyramid.test import WebTestApp
from nextgisweb.vector_layer import VectorLayer

pytestmark = pytest.mark.usefixtures("ngw_resource_defaults", "ngw_auth_administrator")


@pytest.fixture(scope="module")
def test_layer_id(feature_layer_filter_dataset):
    return feature_layer_filter_dataset


@pytest.fixture(scope="module")
def test_field_ids(test_layer_id):
    with transaction.manager:
        layer = VectorLayer.filter_by(id=test_layer_id).one()
        return {f.keyname: f.id for f in layer.fields}


def fetch_names(app: WebTestApp, layer_id: int, **query) -> set[str]:
    resp = app.get(
        f"/api/resource/{layer_id}/feature/",
        query={k: v for k, v in query.items()},
        status=200,
    )
    return {f["fields"]["name"] for f in resp.json}


def fetch_search_context(app: WebTestApp, layer_id: int, **query):
    resp = app.get(
        f"/api/resource/{layer_id}/feature/",
        query={k: v for k, v in query.items()},
        status=200,
    )
    return {f["fields"]["name"]: f["search_context"] for f in resp.json}


def test_text_search_param(ngw_webtest_app: WebTestApp, test_layer_id):
    names = fetch_names(ngw_webtest_app, test_layer_id, text_search="NYC")
    assert names == {"Alice", "Charlie", "Eve"}


def test_text_search_param_case_insensitive(ngw_webtest_app: WebTestApp, test_layer_id):
    names = fetch_names(ngw_webtest_app, test_layer_id, text_search="nyc")
    assert names == {"Alice", "Charlie", "Eve"}


def test_text_search_no_matches(ngw_webtest_app: WebTestApp, test_layer_id):
    names = fetch_names(ngw_webtest_app, test_layer_id, text_search="notfound")
    assert names == set()


def test_text_search_combined_with_filter(ngw_webtest_app: WebTestApp, test_layer_id):
    names = fetch_names(
        ngw_webtest_app,
        test_layer_id,
        text_search="NYC",
        filter='["all", [">", ["get", "age"], 30]]',
    )
    assert names == {"Charlie", "Eve"}


def test_text_search_context_fields(ngw_webtest_app: WebTestApp, test_layer_id, test_field_ids):
    ctx = fetch_search_context(
        ngw_webtest_app, test_layer_id, text_search="NYC", text_search_context="fields"
    )
    assert ctx == {
        "Alice": [test_field_ids["city"]],
        "Charlie": [test_field_ids["city"]],
        "Eve": [test_field_ids["city"]],
    }


def test_text_search_context_multiple_fields(
    ngw_webtest_app: WebTestApp, test_layer_id, test_field_ids
):
    # 'c' matches name (Alice, Charlie) and city ("NYC", for Alice, Charlie and Eve)
    ctx = fetch_search_context(
        ngw_webtest_app, test_layer_id, text_search="c", text_search_context="fields"
    )
    assert ctx["Eve"] == [test_field_ids["city"]]
    assert ctx["Alice"] == [test_field_ids["name"], test_field_ids["city"]]


def test_text_search_context_without_search(ngw_webtest_app: WebTestApp, test_layer_id):
    ngw_webtest_app.get(
        f"/api/resource/{test_layer_id}/feature/",
        query={"text_search_context": "fields"},
        status=422,
    )


def test_text_search_context_from_operator_not_supported(
    ngw_webtest_app: WebTestApp, test_layer_id
):
    # Per the spec, 'text_search' inside the filter expression is search-only;
    # 'text_search_context' requires the separate 'text_search' query parameter.
    ngw_webtest_app.get(
        f"/api/resource/{test_layer_id}/feature/",
        query={
            "filter": '["text_search", "c"]',
            "text_search_context": "fields",
        },
        status=422,
    )


def test_two_text_search_operators(ngw_webtest_app: WebTestApp, test_layer_id):
    # Each operator must match on its own query: SF (city) or 'c' (name/city).
    names = fetch_names(
        ngw_webtest_app,
        test_layer_id,
        filter='["any", ["text_search", "SF"], ["text_search", "c"]]',
    )
    assert names == {"Alice", "Charlie", "Diana", "Eve"}


def test_count_with_text_search(ngw_webtest_app: WebTestApp, test_layer_id):
    resp = ngw_webtest_app.get(
        f"/api/resource/{test_layer_id}/feature_count",
        query={"text_search": "NYC"},
        status=200,
    )
    assert resp.json["total_count"] == 5
    assert resp.json["filtered_count"] == 3


def test_count_with_text_search_and_filter(ngw_webtest_app: WebTestApp, test_layer_id):
    resp = ngw_webtest_app.get(
        f"/api/resource/{test_layer_id}/feature_count",
        query={"text_search": "NYC", "filter": '["all", [">", ["get", "age"], 30]]'},
        status=200,
    )
    assert resp.json["filtered_count"] == 2


def test_export_with_text_search_filter(export_runner):
    names = export_runner.fetch_names(["text_search", "NYC"])
    assert names == {"Alice", "Charlie", "Eve"}
