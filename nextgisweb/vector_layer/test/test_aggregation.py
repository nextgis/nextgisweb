import pytest

pytestmark = pytest.mark.usefixtures("ngw_resource_defaults", "ngw_auth_administrator")

# Dataset summary (from conftest.FILTER_DATASET):
#   Alice:   age=25, score=8.5, city=NYC, birth_date=1998-05-15
#   Bob:     age=30, score=7.0, city=LA,  birth_date=1993-08-22
#   Charlie: age=35, score=9.0, city=NYC, birth_date=1988-12-01
#   Diana:   age=28, score=6.5, city=SF,  birth_date=1995-03-10
#   Eve:     age=32, score=8.0, city=NYC, birth_date=1991-07-18


def aggregate(app, vector_layer_filter_dataset, items, *, filter=None, status=200):
    body = {"items": items}
    if filter is not None:
        body["filter"] = filter
    return app.post(
        f"/api/resource/{vector_layer_filter_dataset}/feature/aggregate",
        json=body,
        status=status,
    ).json


def test_min_max_integer(ngw_webtest_app, vector_layer_filter_dataset):
    result = aggregate(
        ngw_webtest_app, vector_layer_filter_dataset, [{"type": "min_max", "field": "age"}]
    )
    assert result["items"] == [{"type": "min_max", "min": 25, "max": 35}]


def test_min_max_real(ngw_webtest_app, vector_layer_filter_dataset):
    result = aggregate(
        ngw_webtest_app, vector_layer_filter_dataset, [{"type": "min_max", "field": "score"}]
    )
    assert result["items"] == [{"type": "min_max", "min": 6.5, "max": 9.0}]


def test_min_max_string(ngw_webtest_app, vector_layer_filter_dataset):
    result = aggregate(
        ngw_webtest_app, vector_layer_filter_dataset, [{"type": "min_max", "field": "name"}]
    )
    assert result["items"] == [{"type": "min_max", "min": "Alice", "max": "Eve"}]


def test_min_max_date(ngw_webtest_app, vector_layer_filter_dataset):
    result = aggregate(
        ngw_webtest_app, vector_layer_filter_dataset, [{"type": "min_max", "field": "birth_date"}]
    )
    assert result["items"] == [{"type": "min_max", "min": "1988-12-01", "max": "1998-05-15"}]


def test_min_max_multiple_batched(ngw_webtest_app, vector_layer_filter_dataset):
    result = aggregate(
        ngw_webtest_app,
        vector_layer_filter_dataset,
        [
            {"type": "min_max", "field": "age"},
            {"type": "min_max", "field": "score"},
        ],
    )
    assert result["items"] == [
        {"type": "min_max", "min": 25, "max": 35},
        {"type": "min_max", "min": 6.5, "max": 9.0},
    ]


def test_min_max_field_by_id(ngw_webtest_app, vector_layer_filter_dataset):
    info = ngw_webtest_app.get(f"/api/resource/{vector_layer_filter_dataset}").json
    age_id = next(f["id"] for f in info["feature_layer"]["fields"] if f["keyname"] == "age")
    result = aggregate(
        ngw_webtest_app, vector_layer_filter_dataset, [{"type": "min_max", "field": age_id}]
    )
    assert result["items"] == [{"type": "min_max", "min": 25, "max": 35}]


def test_min_max_with_filter(ngw_webtest_app, vector_layer_filter_dataset):
    # NYC: Alice=25, Charlie=35, Eve=32
    result = aggregate(
        ngw_webtest_app,
        vector_layer_filter_dataset,
        [{"type": "min_max", "field": "age"}],
        filter=["==", ["get", "city"], "NYC"],
    )
    assert result["items"] == [{"type": "min_max", "min": 25, "max": 35}]


def test_unique_values_basic(ngw_webtest_app, vector_layer_filter_dataset):
    result = aggregate(
        ngw_webtest_app, vector_layer_filter_dataset, [{"type": "unique_values", "field": "city"}]
    )
    (item,) = result["items"]
    assert item["type"] == "unique_values"
    assert item["overflow"] is False
    assert {b["key"]: b["count"] for b in item["buckets"]} == {"NYC": 3, "LA": 1, "SF": 1}


def test_unique_values_order_value_asc(ngw_webtest_app, vector_layer_filter_dataset):
    result = aggregate(
        ngw_webtest_app,
        vector_layer_filter_dataset,
        [{"type": "unique_values", "field": "city", "order": "value_asc"}],
    )
    assert [b["key"] for b in result["items"][0]["buckets"]] == ["LA", "NYC", "SF"]


def test_unique_values_order_value_desc(ngw_webtest_app, vector_layer_filter_dataset):
    result = aggregate(
        ngw_webtest_app,
        vector_layer_filter_dataset,
        [{"type": "unique_values", "field": "city", "order": "value_desc"}],
    )
    assert [b["key"] for b in result["items"][0]["buckets"]] == ["SF", "NYC", "LA"]


def test_unique_values_order_count_desc(ngw_webtest_app, vector_layer_filter_dataset):
    result = aggregate(
        ngw_webtest_app,
        vector_layer_filter_dataset,
        [{"type": "unique_values", "field": "city", "order": "count_desc"}],
    )
    buckets = result["items"][0]["buckets"]
    assert buckets[0] == {"key": "NYC", "count": 3}
    assert {b["key"] for b in buckets[1:]} == {"LA", "SF"}


def test_unique_values_order_count_asc(ngw_webtest_app, vector_layer_filter_dataset):
    result = aggregate(
        ngw_webtest_app,
        vector_layer_filter_dataset,
        [{"type": "unique_values", "field": "city", "order": "count_asc"}],
    )
    buckets = result["items"][0]["buckets"]
    assert {b["key"] for b in buckets[:2]} == {"LA", "SF"}
    assert buckets[2] == {"key": "NYC", "count": 3}


def test_unique_values_limit_and_overflow(ngw_webtest_app, vector_layer_filter_dataset):
    result = aggregate(
        ngw_webtest_app,
        vector_layer_filter_dataset,
        [{"type": "unique_values", "field": "city", "limit": 2, "order": "value_asc"}],
    )
    item = result["items"][0]
    assert item["overflow"] is True
    assert [b["key"] for b in item["buckets"]] == ["LA", "NYC"]


def test_unique_values_include_counts_false(ngw_webtest_app, vector_layer_filter_dataset):
    result = aggregate(
        ngw_webtest_app,
        vector_layer_filter_dataset,
        [{"type": "unique_values", "field": "city", "include_counts": False}],
    )
    for bucket in result["items"][0]["buckets"]:
        assert "count" not in bucket


def test_unique_values_integer_field(ngw_webtest_app, vector_layer_filter_dataset):
    result = aggregate(
        ngw_webtest_app,
        vector_layer_filter_dataset,
        [{"type": "unique_values", "field": "age", "order": "value_asc"}],
    )
    assert [b["key"] for b in result["items"][0]["buckets"]] == [25, 28, 30, 32, 35]


def test_unique_values_with_filter(ngw_webtest_app, vector_layer_filter_dataset):
    result = aggregate(
        ngw_webtest_app,
        vector_layer_filter_dataset,
        [{"type": "unique_values", "field": "city", "order": "value_asc"}],
        filter=["!=", ["get", "city"], "NYC"],
    )
    item = result["items"][0]
    assert [b["key"] for b in item["buckets"]] == ["LA", "SF"]
    assert item["overflow"] is False


def test_mixed_aggregations(ngw_webtest_app, vector_layer_filter_dataset):
    result = aggregate(
        ngw_webtest_app,
        vector_layer_filter_dataset,
        [
            {"type": "min_max", "field": "age"},
            {"type": "unique_values", "field": "city", "order": "value_asc"},
        ],
    )
    assert result["items"][0] == {"type": "min_max", "min": 25, "max": 35}
    assert [b["key"] for b in result["items"][1]["buckets"]] == ["LA", "NYC", "SF"]
