import json

import pytest
import sqlalchemy as sa

from ..filter import FieldInfo, FilterExpressionError, FilterParser
from ..interface import FIELD_TYPE


def compile_clause(clause):
    return str(clause.compile(compile_kwargs={"literal_binds": True}))


@pytest.fixture
def parser():
    fields = [
        FieldInfo(key="name", datatype=FIELD_TYPE.STRING),
        FieldInfo(key="city", datatype=FIELD_TYPE.STRING),
        FieldInfo(key="price", datatype=FIELD_TYPE.INTEGER),
        FieldInfo(key="rating", datatype=FIELD_TYPE.REAL),
        FieldInfo(key="count", datatype=FIELD_TYPE.BIGINT),
        FieldInfo(key="active", datatype=FIELD_TYPE.STRING),
        FieldInfo(key="date_created", datatype=FIELD_TYPE.DATE),
        FieldInfo(key="time_start", datatype=FIELD_TYPE.TIME),
        FieldInfo(key="updated_at", datatype=FIELD_TYPE.DATETIME),
    ]
    return FilterParser(fields)


@pytest.fixture
def columns():
    return {
        "name": sa.column("name", sa.String()),
        "city": sa.column("city", sa.String()),
        "price": sa.column("price", sa.Integer()),
        "rating": sa.column("rating", sa.Float()),
        "count": sa.column("count", sa.BigInteger()),
        "active": sa.column("active", sa.String()),
        "date_created": sa.column("date_created", sa.Date()),
        "time_start": sa.column("time_start", sa.Time()),
        "updated_at": sa.column("updated_at", sa.DateTime()),
        "id": sa.column("id", sa.Integer()),
    }


def test_all_single_condition(parser, columns):
    program = parser.parse(["all", ["==", ["get", "name"], "Alice"]])
    clause = program.to_clause(columns)
    assert compile_clause(clause) == "name = 'Alice'"


@pytest.mark.parametrize(
    "expression,expected",
    [
        (["all", [">", ["get", "price"], 100]], "price > 100"),
        (["all", [">=", ["get", "rating"], 4.5]], "rating >= 4.5"),
        (["all", ["<", ["get", "price"], 50]], "price < 50"),
        (["all", ["<=", ["get", "count"], 1000]], "count <= 1000"),
        (["all", ["!=", ["get", "city"], "NYC"]], "city != 'NYC'"),
    ],
)
def test_comparison_operators(parser, columns, expression, expected):
    program = parser.parse(expression)
    clause = program.to_clause(columns)
    assert compile_clause(clause) == expected


@pytest.mark.parametrize(
    "expression,expected",
    [
        (["all", ["==", ["get", "name"], "John Doe"]], "name = 'John Doe'"),
        (["all", ["==", ["get", "price"], 42]], "price = 42"),
        (["all", ["==", ["get", "rating"], 3.14]], "rating = 3.14"),
        (["all", ["==", ["get", "active"], True]], "active = 'True'"),
        (["all", ["==", ["get", "name"], None]], "name IS NULL"),
        (["all", [">", ["get", "price"], -10]], "price > -10"),
    ],
)
def test_value_types(parser, columns, expression, expected):
    program = parser.parse(expression)
    clause = program.to_clause(columns)
    assert compile_clause(clause) == expected


@pytest.mark.parametrize(
    "expression,expected",
    [
        (["all", ["in", ["get", "name"], ["Alice", "Bob"]]], "name IN ('Alice', 'Bob')"),
        (["all", ["in", ["get", "price"], [10, 20, 30]]], "price IN (10, 20, 30)"),
    ],
)
def test_in_operator(parser, columns, expression, expected):
    program = parser.parse(expression)
    clause = program.to_clause(columns)
    assert compile_clause(clause) == expected


def test_in_operator_empty_list(parser, columns):
    program = parser.parse(["all", ["in", ["get", "name"], []]])
    clause = program.to_clause(columns)
    assert compile_clause(clause) == "false"


def test_not_in_operator_empty_list(parser, columns):
    program = parser.parse(["all", ["!in", ["get", "name"], []]])
    clause = program.to_clause(columns)
    assert compile_clause(clause) == "true"


def test_has_operator(parser, columns):
    program = parser.parse(["all", ["has", ["get", "name"]]])
    clause = program.to_clause(columns)
    assert compile_clause(clause) == "name IS NOT NULL"


def test_not_has_operator(parser, columns):
    program = parser.parse(["all", ["!has", ["get", "name"]]])
    clause = program.to_clause(columns)
    assert compile_clause(clause) == "name IS NULL"


def test_any_group(parser, columns):
    program = parser.parse(
        ["any", ["==", ["get", "name"], "Alice"], ["==", ["get", "name"], "Bob"]]
    )
    clause = program.to_clause(columns)
    assert compile_clause(clause) == "name = 'Alice' OR name = 'Bob'"


def test_nested_groups(parser, columns):
    program = parser.parse(
        [
            "all",
            ["==", ["get", "name"], "Alice"],
            ["any", ["<", ["get", "price"], 20], [">", ["get", "price"], 80]],
        ]
    )
    clause = program.to_clause(columns)
    assert compile_clause(clause) == "name = 'Alice' AND (price < 20 OR price > 80)"


def test_parse_json_string(parser, columns):
    expr = json.dumps(["all", ["==", ["get", "name"], "Alice"]])
    program = parser.parse(expr)
    clause = program.to_clause(columns)
    assert compile_clause(clause) == "name = 'Alice'"


def test_empty_expression(parser, columns):
    program = parser.parse([])
    assert program.to_clause(columns) is None


def test_invalid_json_string(parser):
    with pytest.raises(FilterExpressionError):
        parser.parse("not valid json {")


def test_unsupported_operator(parser):
    with pytest.raises(FilterExpressionError):
        parser.parse(["all", ["invalid", ["get", "name"], "test"]])


def test_unknown_field(parser):
    with pytest.raises(FilterExpressionError) as exc:
        parser.parse(["all", ["==", ["get", "unknown"], "value"]])
    assert exc.value.data == {"field": "unknown"}


@pytest.mark.parametrize(
    "expression",
    [
        ["all", ["==", "name", "value"]],
        ["all", ["==", ["get"], "value"]],
        ["all", ["==", ["fetch", "name"], "value"]],
    ],
)
def test_invalid_get_expression(parser, expression):
    with pytest.raises(FilterExpressionError):
        parser.parse(expression)


@pytest.mark.parametrize(
    "expression",
    [
        ["all", ["==", ["get", "name"]]],
        ["all", ["in", ["get", "name"]]],
        ["all", ["has", ["get", "name"], "extra"]],
    ],
)
def test_wrong_operand_count(parser, expression):
    with pytest.raises(FilterExpressionError):
        parser.parse(expression)


def test_date_field_filtering(parser, columns):
    program = parser.parse(["all", ["<", ["get", "date_created"], "1995-01-01"]])
    clause = program.to_clause(columns)
    assert compile_clause(clause) == "date_created < '1995-01-01'"


def test_datetime_field_filtering(parser, columns):
    program = parser.parse(["all", [">", ["get", "updated_at"], "2023-03-15T10:30:00"]])
    clause = program.to_clause(columns)
    assert compile_clause(clause) == "updated_at > '2023-03-15 10:30:00'"


def test_time_range_filtering(parser, columns):
    program = parser.parse(
        [
            "all",
            [">=", ["get", "time_start"], "08:00:00"],
            ["<=", ["get", "time_start"], "17:00:00"],
        ]
    )
    clause = program.to_clause(columns)
    assert compile_clause(clause) == "time_start >= '08:00:00' AND time_start <= '17:00:00'"


def test_mixed_date_and_other_fields(parser, columns):
    program = parser.parse(
        [
            "all",
            ["==", ["get", "name"], "Alice"],
            [">", ["get", "date_created"], "2023-01-01"],
            [">", ["get", "price"], 100],
        ]
    )
    clause = program.to_clause(columns)
    assert (
        compile_clause(clause) == "name = 'Alice' AND date_created > '2023-01-01' AND price > 100"
    )


def test_in_operator_type_conversion(parser, columns):
    program = parser.parse(["all", ["in", ["get", "price"], ["10", "20"]]])
    clause = program.to_clause(columns)
    assert compile_clause(clause) == "price IN (10, 20)"


def test_boolean_not_allowed_for_integer(parser):
    with pytest.raises(FilterExpressionError):
        parser.parse(["all", ["==", ["get", "price"], True]])
