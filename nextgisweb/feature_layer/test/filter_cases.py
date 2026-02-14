import json
from typing import Any, NamedTuple

import pytest
import sqlalchemy as sa

from nextgisweb.feature_layer.filter import FieldInfo
from nextgisweb.feature_layer.interface import FIELD_TYPE

FILTER_FIELDS = [
    FieldInfo(key="name", datatype=FIELD_TYPE.STRING),
    FieldInfo(key="age", datatype=FIELD_TYPE.INTEGER),
    FieldInfo(key="city", datatype=FIELD_TYPE.STRING),
    FieldInfo(key="score", datatype=FIELD_TYPE.REAL),
    FieldInfo(key="birth_date", datatype=FIELD_TYPE.DATE),
    FieldInfo(key="work_start", datatype=FIELD_TYPE.TIME),
    FieldInfo(key="created_at", datatype=FIELD_TYPE.DATETIME),
    FieldInfo(key="field_1", datatype=FIELD_TYPE.INTEGER),
    FieldInfo(key="field_2", datatype=FIELD_TYPE.INTEGER),
]

FILTER_SQL_COLUMNS = {
    "name": sa.column("name", sa.String()),
    "age": sa.column("age", sa.Integer()),
    "city": sa.column("city", sa.String()),
    "score": sa.column("score", sa.Float()),
    "birth_date": sa.column("birth_date", sa.Date()),
    "work_start": sa.column("work_start", sa.Time()),
    "created_at": sa.column("created_at", sa.DateTime()),
    "field_1": sa.column("field_1", sa.Integer()),
    "field_2": sa.column("field_2", sa.Integer()),
}

FILTER_GEOJSON = {
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
                "field_1": 10,
                "field_2": 20,
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
                "field_1": 10,
                "field_2": 20,
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
                "field_1": 10,
                "field_2": 10,
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
                "field_1": 10,
                "field_2": 5,
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
                "field_1": 10,
                "field_2": 5,
            },
            "geometry": {"type": "Point", "coordinates": [4, 4]},
        },
    ],
}


class FilterRunner:
    def __init__(self, app, layer_id):
        self.app = app
        self.layer_id = layer_id

    def fetch_response(self, expression: Any, **kwargs):
        raise NotImplementedError

    def fetch_names(self, expression: Any, **kwargs) -> set[str]:
        raise NotImplementedError


class APIRunner(FilterRunner):
    def fetch_response(self, expression: Any, **kwargs):
        query = {"filter": json.dumps(expression)}
        query.update(kwargs)
        status = kwargs.get("status", 200)
        return self.app.get(f"/api/resource/{self.layer_id}/feature/", query=query, status=status)

    def fetch_names(self, expression: Any, **kwargs) -> set[str]:
        query = {"filter": json.dumps(expression)}
        query.update(kwargs)

        status = kwargs.get("status", 200)
        resp = self.app.get(f"/api/resource/{self.layer_id}/feature/", query=query, status=status)

        if status != 200:
            return set()

        return {f["fields"]["name"] for f in resp.json}


class GeoJSONRunner(FilterRunner):
    def fetch_response(self, expression: Any, **kwargs):
        qs = {
            "format": "GeoJSON",
            "srs": "3857",
            "zipped": "false",
        }
        if expression is not None:
            qs["filter"] = json.dumps(expression)
        qs.update(kwargs)
        status = kwargs.get("status", 200)
        return self.app.get(f"/api/resource/{self.layer_id}/export", query=qs, status=status)

    def fetch_names(self, expression: Any, **kwargs) -> set[str]:
        qs = {
            "format": "GeoJSON",
            "srs": "3857",
            "zipped": "false",
        }
        if expression is not None:
            qs["filter"] = json.dumps(expression)
        qs.update(kwargs)

        status = kwargs.get("status", 200)
        resp = self.app.get(f"/api/resource/{self.layer_id}/export", query=qs, status=status)

        if status != 200:
            return set()

        return {f["properties"]["name"] for f in resp.json["features"]}


class FilterCase(NamedTuple):
    id: str
    expression: Any
    expected_names: set[str]
    expected_sql: str | None
    auto_all: bool = False


FILTER_REGISTRY: list[FilterCase] = [
    # Comparison
    FilterCase("empty_array", [], {"Alice", "Bob", "Charlie", "Diana", "Eve"}, None),
    FilterCase("eq_name", ["==", ["get", "name"], "Alice"], {"Alice"}, "name = 'Alice'", True),
    FilterCase("gt_age", [">", ["get", "age"], 30], {"Charlie", "Eve"}, "age > 30", True),
    FilterCase(
        "ge_score",
        [">=", ["get", "score"], 8.0],
        {"Alice", "Charlie", "Eve"},
        "score >= 8.0",
        True,
    ),
    FilterCase("ne_city", ["!=", ["get", "city"], "NYC"], {"Bob", "Diana"}, "city != 'NYC'", True),
    FilterCase(
        "lt_date",
        ["<", ["get", "birth_date"], "1995-01-01"],
        {"Bob", "Charlie", "Eve"},
        "birth_date < '1995-01-01'",
        True,
    ),
    FilterCase("le_age", ["<=", ["get", "age"], 30], {"Alice", "Bob", "Diana"}, "age <= 30", True),
    FilterCase(
        "eq_time",
        ["==", ["get", "work_start"], "09:00:00"],
        {"Alice"},
        "work_start = '09:00:00'",
        True,
    ),
    FilterCase(
        "lt_time",
        ["<", ["get", "work_start"], "09:00:00"],
        {"Charlie", "Eve"},
        "work_start < '09:00:00'",
        True,
    ),
    FilterCase("eq_name_null", ["==", ["get", "name"], None], set(), "name IS NULL", True),
    FilterCase(
        "ne_name_null",
        ["!=", ["get", "name"], None],
        {"Alice", "Bob", "Charlie", "Diana", "Eve"},
        "name IS NOT NULL",
        True,
    ),
    FilterCase("eq_null_name", ["==", None, ["get", "name"]], set(), "name IS NULL", True),
    FilterCase(
        "ne_null_name",
        ["!=", None, ["get", "name"]],
        {"Alice", "Bob", "Charlie", "Diana", "Eve"},
        "name IS NOT NULL",
        True,
    ),
    # Lists and inclusions
    FilterCase(
        "in_names",
        ["in", ["get", "name"], "Alice", "Bob", "Charlie"],
        {"Alice", "Bob", "Charlie"},
        "name IN ('Alice', 'Bob', 'Charlie')",
        True,
    ),
    FilterCase(
        "not_in_city",
        ["!in", ["get", "city"], "NYC", "LA"],
        {"Diana"},
        "(city NOT IN ('NYC', 'LA'))",
        True,
    ),
    FilterCase(
        "in_single_name", ["in", ["get", "name"], "Alice"], {"Alice"}, "name IN ('Alice')", True
    ),
    FilterCase(
        "not_in_single_city",
        ["!in", ["get", "city"], "NYC"],
        {"Bob", "Diana"},
        "(city NOT IN ('NYC'))",
        True,
    ),
    # Existence
    FilterCase(
        "has_field",
        ["has", ["get", "name"]],
        {"Alice", "Bob", "Charlie", "Diana", "Eve"},
        "name IS NOT NULL",
        True,
    ),
    FilterCase("not_has_field", ["!has", ["get", "name"]], set(), "name IS NULL", True),
    # Column vs Column
    FilterCase(
        "gt_col",
        [">", ["get", "field_1"], ["get", "field_2"]],
        {"Diana", "Eve"},
        "field_1 > field_2",
        True,
    ),
    FilterCase("gt_lit_col", [">", 30, ["get", "age"]], {"Alice", "Diana"}, "30 > age", True),
    # Complex logic
    FilterCase(
        "any_two_names",
        ["any", ["==", ["get", "name"], "Alice"], ["==", ["get", "name"], "Bob"]],
        {"Alice", "Bob"},
        "name = 'Alice' OR name = 'Bob'",
    ),
    FilterCase(
        "all_col_and_age",
        ["all", ["<", ["get", "field_1"], ["get", "field_2"]], [">=", ["get", "age"], 30]],
        {"Bob"},
        "field_1 < field_2 AND age >= 30",
    ),
    FilterCase(
        "all_city_and_birth_date",
        ["all", ["==", ["get", "city"], "NYC"], [">", ["get", "birth_date"], "1990-01-01"]],
        {"Alice", "Eve"},
        "city = 'NYC' AND birth_date > '1990-01-01'",
    ),
    FilterCase(
        "any_col_or_all_col_age",
        [
            "any",
            [">", ["get", "field_1"], ["get", "field_2"]],
            ["all", ["==", ["get", "field_1"], ["get", "field_2"]], [">", ["get", "age"], 30]],
        ],
        {"Diana", "Eve", "Charlie"},
        "field_1 > field_2 OR field_1 = field_2 AND age > 30",
    ),
    FilterCase(
        "datetime_range",
        [
            "all",
            [">=", ["get", "created_at"], "2023-01-01T00:00:00"],
            ["<", ["get", "created_at"], "2023-02-01T00:00:00"],
        ],
        {"Alice", "Diana"},
        "created_at >= '2023-01-01 00:00:00' AND created_at < '2023-02-01 00:00:00'",
    ),
]


def get_parser_cases(only_auto_all: bool = False):
    return [
        pytest.param(c.expression, c.expected_sql, id=c.id)
        for c in FILTER_REGISTRY
        if (c.auto_all if only_auto_all else True)
    ]


def get_integration_cases(only_auto_all: bool = False):
    return [
        pytest.param(c.expression, c.expected_names, id=c.id)
        for c in FILTER_REGISTRY
        if (c.auto_all if only_auto_all else True)
    ]


class InvalidFilterCase(NamedTuple):
    id: str
    expression: Any
    auto_all: bool
    parser_raises: bool = True
    api_status: int = 422
    export_status: int = 422
    error_pattern: str | None = None


_E = "Invalid filter expression"

INVALID_DATA_CASES = [
    ("invalid_json_string", "not valid json {", False, _E),
    ("unsupported_operator", ["unsupported", ["get", "name"], "Alice"], True, _E),
    (
        "operator_not_string",
        [123, ["get", "name"], "Alice"],
        True,
        _E,
    ),
    ("unknown_field", ["==", ["get", "nonexistent"], "value"], True, _E),
    ("get_plain_string_instead_ref", ["==", "name", "value"], True, _E),
    ("get_without_field_name", ["==", ["get"], "value"], True, _E),
    ("get_wrong_keyword", ["==", ["fetch", "name"], "value"], True, _E),
    ("nested_get_in_field_name", ["==", ["get", ["get", "name"]], "value"], True, _E),
    ("eq_missing_right_operand", ["==", ["get", "name"]], True, _E),
    ("has_with_extra_operand", ["has", ["get", "name"], "extra"], True, _E),
    ("in_without_values", ["in", ["get", "name"]], True, _E),
    ("not_in_without_values", ["!in", ["get", "name"]], True, _E),
    ("in_nested_list_not_allowed", ["in", ["get", "name"], ["Alice", "Bob"]], True, _E),
    ("in_property_reference_as_value", ["in", ["get", "name"], ["get", "city"]], True, _E),
    ("in_literal_subject", ["in", "Alice", ["get", "name"]], True, _E),
    ("int_bool_rejected", ["==", ["get", "age"], True], True, _E),
    ("float_bool_rejected", [">", ["get", "score"], True], True, _E),
    ("str_object_rejected", ["==", ["get", "name"], {"x": 1}], True, _E),
    ("date_int_rejected", ["==", ["get", "birth_date"], 123], True, _E),
    ("time_int_rejected", ["==", ["get", "work_start"], 123], True, _E),
    ("datetime_int_rejected", ["==", ["get", "created_at"], 123], True, _E),
    ("wrong_get_expression", ["get", ["get", "name"]], True, _E),
    ("all_with_empty_array", ["all", []], False, _E),
]

INVALID_FILTER_CASES = [
    InvalidFilterCase(id=id, expression=expr, auto_all=auto, error_pattern=err)
    for id, expr, auto, err in INVALID_DATA_CASES
]


def get_invalid_filter_cases():
    return [pytest.param(c, id=c.id) for c in INVALID_FILTER_CASES]


def get_invalid_parser_cases():
    return [pytest.param(c, id=c.id) for c in INVALID_FILTER_CASES if c.parser_raises]
