import json

import pytest
import transaction

from nextgisweb.env import DBSession

from nextgisweb.vector_layer import VectorLayer

pytestmark = pytest.mark.usefixtures("ngw_resource_defaults", "ngw_auth_administrator")


@pytest.fixture(scope="module")
def test_layer_id():
    with transaction.manager:
        geojson = {
            "type": "FeatureCollection",
            "crs": {"type": "name", "properties": {"name": "urn:ogc:def:crs:EPSG::3857"}},
            "features": [
                {
                    "type": "Feature",
                    "properties": {
                        "name": "Alice",
                        "age": 25,
                        "score": 8.5,
                        "city": "NYC",
                        "birth_date": "1998-05-15",
                        "created_at": "2023-01-10T08:30:00",
                        "work_start": "09:00:00",
                    },
                    "geometry": {"type": "Point", "coordinates": [0, 0]},
                },
                {
                    "type": "Feature",
                    "properties": {
                        "name": "Bob",
                        "age": 30,
                        "score": 7.0,
                        "city": "LA",
                        "birth_date": "1993-08-22",
                        "created_at": "2023-02-15T14:45:30",
                        "work_start": "10:30:00",
                    },
                    "geometry": {"type": "Point", "coordinates": [1, 1]},
                },
                {
                    "type": "Feature",
                    "properties": {
                        "name": "Charlie",
                        "age": 35,
                        "score": 9.0,
                        "city": "NYC",
                        "birth_date": "1988-12-01",
                        "created_at": "2023-03-20T16:20:15",
                        "work_start": "08:00:00",
                    },
                    "geometry": {"type": "Point", "coordinates": [2, 2]},
                },
                {
                    "type": "Feature",
                    "properties": {
                        "name": "Diana",
                        "age": 28,
                        "score": 6.5,
                        "city": "SF",
                        "birth_date": "1995-03-10",
                        "created_at": "2023-01-25T11:15:00",
                        "work_start": "09:30:00",
                    },
                    "geometry": {"type": "Point", "coordinates": [3, 3]},
                },
                {
                    "type": "Feature",
                    "properties": {
                        "name": "Eve",
                        "age": 32,
                        "score": 8.0,
                        "city": "NYC",
                        "birth_date": "1991-07-18",
                        "created_at": "2023-04-05T10:00:00",
                        "work_start": "08:30:00",
                    },
                    "geometry": {"type": "Point", "coordinates": [4, 4]},
                },
            ],
        }

        obj = VectorLayer().persist().from_ogr(json.dumps(geojson))
        DBSession.flush()

    yield obj.id


def test_filter_all_single_condition(ngw_webtest_app, test_layer_id):
    filter_expr = json.dumps(["all", ["==", ["get", "name"], "Alice"]])

    resp = ngw_webtest_app.get(
        f"/api/resource/{test_layer_id}/feature/", {"filter": filter_expr}, status=200
    )

    assert len(resp.json) == 1
    assert resp.json[0]["fields"]["name"] == "Alice"


def test_filter_all_multiple_conditions(ngw_webtest_app, test_layer_id):
    filter_expr = json.dumps(["all", ["==", ["get", "city"], "NYC"], [">", ["get", "age"], 26]])

    resp = ngw_webtest_app.get(
        f"/api/resource/{test_layer_id}/feature/", {"filter": filter_expr}, status=200
    )

    assert len(resp.json) == 2
    names = {f["fields"]["name"] for f in resp.json}
    assert names == {"Charlie", "Eve"}


def test_filter_any_multiple_conditions(ngw_webtest_app, test_layer_id):
    filter_expr = json.dumps(
        ["any", ["==", ["get", "name"], "Alice"], ["==", ["get", "name"], "Bob"]]
    )

    resp = ngw_webtest_app.get(
        f"/api/resource/{test_layer_id}/feature/", {"filter": filter_expr}, status=200
    )

    assert len(resp.json) == 2
    names = {f["fields"]["name"] for f in resp.json}
    assert names == {"Alice", "Bob"}


def test_filter_nested_groups(ngw_webtest_app, test_layer_id):
    filter_expr = json.dumps(
        [
            "all",
            ["==", ["get", "city"], "NYC"],
            ["any", ["<", ["get", "age"], 27], [">", ["get", "age"], 33]],
        ]
    )

    resp = ngw_webtest_app.get(
        f"/api/resource/{test_layer_id}/feature/", {"filter": filter_expr}, status=200
    )

    # Should match: Alice (25, NYC) and Charlie (35, NYC)
    assert len(resp.json) == 2
    names = {f["fields"]["name"] for f in resp.json}
    assert names == {"Alice", "Charlie"}


def test_filter_comparison_operators(ngw_webtest_app, test_layer_id):
    # Greater than
    filter_expr = json.dumps(["all", [">", ["get", "age"], 30]])
    resp = ngw_webtest_app.get(
        f"/api/resource/{test_layer_id}/feature/", {"filter": filter_expr}, status=200
    )
    assert len(resp.json) == 2  # Charlie (35) and Eve (32)

    # Greater or equal
    filter_expr = json.dumps(["all", [">=", ["get", "score"], 8.0]])
    resp = ngw_webtest_app.get(
        f"/api/resource/{test_layer_id}/feature/", {"filter": filter_expr}, status=200
    )
    assert len(resp.json) == 3  # Alice (8.5), Charlie (9.0), Eve (8.0)

    # Less than
    filter_expr = json.dumps(["all", ["<", ["get", "age"], 30]])
    resp = ngw_webtest_app.get(
        f"/api/resource/{test_layer_id}/feature/", {"filter": filter_expr}, status=200
    )
    assert len(resp.json) == 2  # Alice (25) and Diana (28)

    # Not equal
    filter_expr = json.dumps(["all", ["!=", ["get", "city"], "NYC"]])
    resp = ngw_webtest_app.get(
        f"/api/resource/{test_layer_id}/feature/", {"filter": filter_expr}, status=200
    )
    assert len(resp.json) == 2  # Bob (LA) and Diana (SF)


def test_filter_in_operator(ngw_webtest_app, test_layer_id):
    """Test 'in' operator."""
    filter_expr = json.dumps(["all", ["in", ["get", "name"], ["Alice", "Bob", "Charlie"]]])

    resp = ngw_webtest_app.get(
        f"/api/resource/{test_layer_id}/feature/", {"filter": filter_expr}, status=200
    )

    assert len(resp.json) == 3
    names = {f["fields"]["name"] for f in resp.json}
    assert names == {"Alice", "Bob", "Charlie"}


def test_filter_not_in_operator(ngw_webtest_app, test_layer_id):
    """Test '!in' operator."""
    filter_expr = json.dumps(["all", ["!in", ["get", "city"], ["NYC", "LA"]]])

    resp = ngw_webtest_app.get(
        f"/api/resource/{test_layer_id}/feature/", {"filter": filter_expr}, status=200
    )

    assert len(resp.json) == 1
    assert resp.json[0]["fields"]["city"] == "SF"


def test_filter_complex_nested(ngw_webtest_app, test_layer_id):
    """Test complex nested groups with multiple levels."""
    filter_expr = json.dumps(
        [
            "all",
            [">", ["get", "age"], 26],
            [
                "any",
                ["all", ["==", ["get", "city"], "NYC"], [">=", ["get", "score"], 8.5]],
                ["==", ["get", "city"], "LA"],
            ],
        ]
    )

    resp = ngw_webtest_app.get(
        f"/api/resource/{test_layer_id}/feature/", {"filter": filter_expr}, status=200
    )

    # Should match: Bob (30, LA, 7.0), Charlie (35, NYC, 9.0)
    assert len(resp.json) == 2
    names = {f["fields"]["name"] for f in resp.json}
    assert names == {"Bob", "Charlie"}


def test_filter_empty_expression(ngw_webtest_app, test_layer_id):
    """Test empty filter returns all features."""
    filter_expr = json.dumps([])

    resp = ngw_webtest_app.get(
        f"/api/resource/{test_layer_id}/feature/", {"filter": filter_expr}, status=200
    )

    assert len(resp.json) == 5


def test_filter_invalid_format(ngw_webtest_app, test_layer_id):
    # Missing logical operator at top level
    filter_expr = json.dumps(["==", ["get", "name"], "Alice"])

    ngw_webtest_app.get(
        f"/api/resource/{test_layer_id}/feature/", {"filter": filter_expr}, status=422
    )


def test_filter_invalid_json(ngw_webtest_app, test_layer_id):
    """Test invalid JSON returns error."""
    filter_expr = "not valid json {"

    ngw_webtest_app.get(
        f"/api/resource/{test_layer_id}/feature/", {"filter": filter_expr}, status=422
    )


def test_filter_unknown_field(ngw_webtest_app, test_layer_id):
    """Test filter with unknown field returns error."""
    filter_expr = json.dumps(["all", ["==", ["get", "nonexistent"], "value"]])

    ngw_webtest_app.get(
        f"/api/resource/{test_layer_id}/feature/", {"filter": filter_expr}, status=422
    )


def test_filter_with_pagination(ngw_webtest_app, test_layer_id):
    filter_expr = json.dumps(["all", ["==", ["get", "city"], "NYC"]])

    # Get first 2 results
    resp = ngw_webtest_app.get(
        f"/api/resource/{test_layer_id}/feature/",
        {"filter": filter_expr, "limit": 2, "offset": 0},
        status=200,
    )
    assert len(resp.json) == 2

    # Get next result
    resp = ngw_webtest_app.get(
        f"/api/resource/{test_layer_id}/feature/",
        {"filter": filter_expr, "limit": 2, "offset": 2},
        status=200,
    )
    assert len(resp.json) == 1


def test_filter_with_ordering(ngw_webtest_app, test_layer_id):
    filter_expr = json.dumps(["all", ["==", ["get", "city"], "NYC"]])

    resp = ngw_webtest_app.get(
        f"/api/resource/{test_layer_id}/feature/",
        {"filter": filter_expr, "order_by": "-age"},
        status=200,
    )

    # Should be ordered by age descending: Charlie (35), Eve (32), Alice (25)
    assert len(resp.json) == 3
    ages = [f["fields"]["age"] for f in resp.json]
    assert ages == [35, 32, 25]


def test_filter_multiple_nested_groups_at_top(ngw_webtest_app, test_layer_id):
    """Test multiple nested groups at top level with ANY."""
    filter_expr = json.dumps(
        [
            "any",
            [
                "all",
                ["==", ["get", "name"], "Alice"],
                ["==", ["get", "age"], 25],
            ],
            [
                "all",
                ["==", ["get", "name"], "Bob"],
                ["==", ["get", "age"], 30],
            ],
        ]
    )

    resp = ngw_webtest_app.get(
        f"/api/resource/{test_layer_id}/feature/", {"filter": filter_expr}, status=200
    )

    # Should match Alice (25) OR Bob (30)
    assert len(resp.json) == 2
    names = {f["fields"]["name"] for f in resp.json}
    assert names == {"Alice", "Bob"}


def test_filter_multiple_nested_groups_impossible_condition(ngw_webtest_app, test_layer_id):
    """Test multiple nested groups with ALL (logically impossible)."""
    filter_expr = json.dumps(
        [
            "all",
            [
                "all",
                ["==", ["get", "city"], "NYC"],
                ["==", ["get", "age"], 25],
            ],
            [
                "all",
                ["==", ["get", "city"], "NYC"],
                ["==", ["get", "age"], 35],
            ],
        ]
    )

    resp = ngw_webtest_app.get(
        f"/api/resource/{test_layer_id}/feature/", {"filter": filter_expr}, status=200
    )

    # Should match nothing (age can't be both 25 AND 35)
    assert len(resp.json) == 0


def test_filter_date_field(ngw_webtest_app, test_layer_id):
    """Test filtering by date field."""
    filter_expr = json.dumps(["all", ["<", ["get", "birth_date"], "1995-01-01"]])

    resp = ngw_webtest_app.get(
        f"/api/resource/{test_layer_id}/feature/", {"filter": filter_expr}, status=200
    )

    # Should match Bob (1993-08-22) and Charlie (1988-12-01)
    assert len(resp.json) == 3
    names = {f["fields"]["name"] for f in resp.json}
    assert names == {"Bob", "Charlie", "Eve"}


def test_filter_date_equality(ngw_webtest_app, test_layer_id):
    """Test filtering by exact date."""
    filter_expr = json.dumps(["all", ["==", ["get", "birth_date"], "1998-05-15"]])

    resp = ngw_webtest_app.get(
        f"/api/resource/{test_layer_id}/feature/", {"filter": filter_expr}, status=200
    )

    assert len(resp.json) == 1
    assert resp.json[0]["fields"]["name"] == "Alice"


def test_filter_datetime_field(ngw_webtest_app, test_layer_id):
    """Test filtering by datetime field."""
    filter_expr = json.dumps(["all", [">", ["get", "created_at"], "2023-03-01T00:00:00"]])

    resp = ngw_webtest_app.get(
        f"/api/resource/{test_layer_id}/feature/", {"filter": filter_expr}, status=200
    )

    # Should match Charlie (2023-03-20) and Eve (2023-04-05)
    assert len(resp.json) == 2
    names = {f["fields"]["name"] for f in resp.json}
    assert names == {"Charlie", "Eve"}


def test_filter_datetime_range(ngw_webtest_app, test_layer_id):
    """Test filtering by datetime range."""
    filter_expr = json.dumps(
        [
            "all",
            [">=", ["get", "created_at"], "2023-01-01T00:00:00"],
            ["<", ["get", "created_at"], "2023-02-01T00:00:00"],
        ]
    )

    resp = ngw_webtest_app.get(
        f"/api/resource/{test_layer_id}/feature/", {"filter": filter_expr}, status=200
    )

    # Should match Alice (2023-01-10) and Diana (2023-01-25)
    assert len(resp.json) == 2
    names = {f["fields"]["name"] for f in resp.json}
    assert names == {"Alice", "Diana"}


def test_filter_time_field(ngw_webtest_app, test_layer_id):
    """Test filtering by time field."""
    filter_expr = json.dumps(["all", ["<", ["get", "work_start"], "09:00:00"]])

    resp = ngw_webtest_app.get(
        f"/api/resource/{test_layer_id}/feature/", {"filter": filter_expr}, status=200
    )

    # Should match Charlie (08:00:00) and Eve (08:30:00)
    assert len(resp.json) == 2
    names = {f["fields"]["name"] for f in resp.json}
    assert names == {"Charlie", "Eve"}


def test_filter_time_equality(ngw_webtest_app, test_layer_id):
    """Test filtering by exact time."""
    filter_expr = json.dumps(["all", ["==", ["get", "work_start"], "09:00:00"]])

    resp = ngw_webtest_app.get(
        f"/api/resource/{test_layer_id}/feature/", {"filter": filter_expr}, status=200
    )

    assert len(resp.json) == 1
    assert resp.json[0]["fields"]["name"] == "Alice"


def test_filter_mixed_date_and_string(ngw_webtest_app, test_layer_id):
    """Test combining date filter with string filter."""
    filter_expr = json.dumps(
        [
            "all",
            ["==", ["get", "city"], "NYC"],
            [">", ["get", "birth_date"], "1990-01-01"],
        ]
    )

    resp = ngw_webtest_app.get(
        f"/api/resource/{test_layer_id}/feature/", {"filter": filter_expr}, status=200
    )

    # Should match Alice (NYC, 1998-05-15) and Eve (NYC, 1991-07-18)
    assert len(resp.json) == 2
    names = {f["fields"]["name"] for f in resp.json}
    assert names == {"Alice", "Eve"}
