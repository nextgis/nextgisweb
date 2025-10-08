import json

import pytest

from ..filter import FilterParser, FilterValidationError


class MockField:
    def __init__(self, keyname, datatype):
        self.keyname = keyname
        self.datatype = datatype


class MockLayer:
    def __init__(self, fields):
        self.fields = fields


@pytest.fixture
def layer():
    fields = [
        MockField("name", "STRING"),
        MockField("price", "INTEGER"),
        MockField("rating", "REAL"),
        MockField("count", "BIGINT"),
        MockField("active", "STRING"),
        MockField("date_created", "DATE"),
        MockField("time_start", "TIME"),
        MockField("updated_at", "DATETIME"),
    ]
    return MockLayer(fields)


@pytest.fixture
def parser(layer):
    return FilterParser(layer)


@pytest.mark.parametrize(
    "expression,expected",
    [
        (["all", ["==", ["get", "name"], "test"]], ("all", [("name", "eq", "test")])),
        (["all", ["!=", ["get", "name"], "test"]], ("all", [("name", "ne", "test")])),
        (["all", [">", ["get", "price"], 100]], ("all", [("price", "gt", 100)])),
        (["all", ["<", ["get", "price"], 50]], ("all", [("price", "lt", 50)])),
        (["all", [">=", ["get", "rating"], 4.5]], ("all", [("rating", "ge", 4.5)])),
        (["all", ["<=", ["get", "count"], 1000]], ("all", [("count", "le", 1000)])),
    ],
)
def test_comparison_operators(parser, expression, expected):
    result = parser.parse(expression)
    assert result == expected


@pytest.mark.parametrize(
    "expression,expected",
    [
        # String values
        (["all", ["==", ["get", "name"], "John Doe"]], ("all", [("name", "eq", "John Doe")])),
        # Integer values
        (["all", ["==", ["get", "price"], 42]], ("all", [("price", "eq", 42)])),
        # Float values
        (["all", ["==", ["get", "rating"], 3.14]], ("all", [("rating", "eq", 3.14)])),
        # Boolean values
        (["all", ["==", ["get", "active"], True]], ("all", [("active", "eq", True)])),
        # Null values
        (["all", ["==", ["get", "name"], None]], ("all", [("name", "eq", None)])),
        # Negative numbers
        (["all", [">", ["get", "price"], -10]], ("all", [("price", "gt", -10)])),
        # Zero
        (["all", ["==", ["get", "count"], 0]], ("all", [("count", "eq", 0)])),
    ],
)
def test_value_types(parser, expression, expected):
    result = parser.parse(expression)
    assert result == expected


@pytest.mark.parametrize(
    "expression,expected",
    [
        (
            ["all", ["in", ["get", "name"], ["Alice", "Bob"]]],
            ("all", [("name", "in", "Alice,Bob")]),
        ),
        (["all", ["!in", ["get", "name"], ["Charlie"]]], ("all", [("name", "notin", "Charlie")])),
        (["all", ["in", ["get", "price"], [10, 20, 30]]], ("all", [("price", "in", "10,20,30")])),
        (["all", ["in", ["get", "rating"], [4.5, 5.0]]], ("all", [("rating", "in", "4.5,5.0")])),
        # Empty array edge case
        (["all", ["in", ["get", "name"], []]], ("all", [("name", "in", "")])),
        # Single value
        (["all", ["in", ["get", "price"], [100]]], ("all", [("price", "in", "100")])),
    ],
)
def test_in_operators(parser, expression, expected):
    result = parser.parse(expression)
    assert result == expected


@pytest.mark.parametrize(
    "expression,expected",
    [
        (["all", ["has", ["get", "name"]]], ("all", [("name", "isnull", "no")])),
        (["all", ["!has", ["get", "price"]]], ("all", [("price", "isnull", "yes")])),
        (["all", ["has", ["get", "rating"]]], ("all", [("rating", "isnull", "no")])),
        (["all", ["!has", ["get", "date_created"]]], ("all", [("date_created", "isnull", "yes")])),
    ],
)
def test_has_operators(parser, expression, expected):
    result = parser.parse(expression)
    assert result == expected


def test_all_group(parser):
    expression = [
        "all",
        ["==", ["get", "name"], "test"],
        [">", ["get", "price"], 100],
    ]
    result = parser.parse(expression)
    expected = (
        "all",
        [
            ("name", "eq", "test"),
            ("price", "gt", 100),
        ],
    )
    assert result == expected


def test_any_group(parser):
    expression = [
        "any",
        ["==", ["get", "name"], "Alice"],
        ["==", ["get", "name"], "Bob"],
    ]
    result = parser.parse(expression)
    expected = (
        "any",
        [
            ("name", "eq", "Alice"),
            ("name", "eq", "Bob"),
        ],
    )
    assert result == expected


def test_nested_groups(parser):
    expression = [
        "all",
        ["==", ["get", "active"], True],
        [
            "any",
            [">", ["get", "price"], 100],
            ["<", ["get", "price"], 10],
        ],
    ]
    result = parser.parse(expression)
    expected = (
        "all",
        [
            ("active", "eq", True),
            (
                "any",
                [
                    ("price", "gt", 100),
                    ("price", "lt", 10),
                ],
            ),
        ],
    )
    assert result == expected


def test_complex_nested_groups(parser):
    expression = [
        "all",
        ["==", ["get", "active"], True],
        [
            "any",
            [
                "all",
                [">", ["get", "price"], 100],
                ["<", ["get", "rating"], 5],
            ],
            ["has", ["get", "date_created"]],
        ],
    ]
    result = parser.parse(expression)
    expected = (
        "all",
        [
            ("active", "eq", True),
            (
                "any",
                [
                    (
                        "all",
                        [
                            ("price", "gt", 100),
                            ("rating", "lt", 5),
                        ],
                    ),
                    ("date_created", "isnull", "no"),
                ],
            ),
        ],
    )
    assert result == expected


def test_multiple_conditions_in_group(parser):
    expression = [
        "all",
        [">=", ["get", "price"], 10],
        ["<=", ["get", "price"], 100],
        [">=", ["get", "rating"], 3.0],
        ["has", ["get", "name"]],
    ]
    result = parser.parse(expression)
    expected = (
        "all",
        [
            ("price", "ge", 10),
            ("price", "le", 100),
            ("rating", "ge", 3.0),
            ("name", "isnull", "no"),
        ],
    )
    assert result == expected


def test_parse_json_string(parser):
    expression_str = json.dumps(["all", ["==", ["get", "name"], "test"]])
    result = parser.parse(expression_str)
    expected = ("all", [("name", "eq", "test")])
    assert result == expected


def test_parse_json_string_complex(parser):
    expression = [
        "all",
        ["==", ["get", "name"], "test"],
        [">", ["get", "price"], 100],
    ]
    expression_str = json.dumps(expression)
    result = parser.parse(expression_str)
    expected = (
        "all",
        [
            ("name", "eq", "test"),
            ("price", "gt", 100),
        ],
    )
    assert result == expected


def test_empty_expression(parser):
    result = parser.parse([])
    assert result == []


def test_invalid_json_string(parser):
    with pytest.raises(FilterValidationError) as exc_info:
        parser.parse("not valid json {")
    assert "Invalid JSON" in str(exc_info.value)


def test_unsupported_operator(parser):
    with pytest.raises(FilterValidationError) as exc_info:
        parser.parse(["all", ["unknown_op", ["get", "name"], "test"]])
    assert "Unsupported operator" in str(exc_info.value)


def test_unknown_field(parser):
    with pytest.raises(FilterValidationError) as exc_info:
        parser.parse(["all", ["==", ["get", "unknown_field"], "test"]])
    assert "Unknown field" in str(exc_info.value)


def test_invalid_get_expression_not_array(parser):
    with pytest.raises(FilterValidationError) as exc_info:
        parser.parse(["all", ["==", "name", "test"]])
    assert "Invalid 'get' expression" in str(exc_info.value)


def test_invalid_get_expression_wrong_length(parser):
    with pytest.raises(FilterValidationError) as exc_info:
        parser.parse(["all", ["==", ["get"], "test"]])
    assert "Invalid 'get' expression" in str(exc_info.value)


def test_invalid_get_operator(parser):
    with pytest.raises(FilterValidationError) as exc_info:
        parser.parse(["all", ["==", ["fetch", "name"], "test"]])
    assert "Expected 'get' operator" in str(exc_info.value)


def test_comparison_wrong_element_count(parser):
    with pytest.raises(FilterValidationError) as exc_info:
        parser.parse(["all", ["==", ["get", "name"]]])
    assert "must have 3 elements" in str(exc_info.value)


def test_in_wrong_element_count(parser):
    with pytest.raises(FilterValidationError) as exc_info:
        parser.parse(["all", ["in", ["get", "name"]]])
    assert "must have 3 elements" in str(exc_info.value)


def test_in_non_array_values(parser):
    with pytest.raises(FilterValidationError) as exc_info:
        parser.parse(["all", ["in", ["get", "name"], "not_an_array"]])
    assert "requires array of values" in str(exc_info.value)


def test_has_wrong_element_count(parser):
    with pytest.raises(FilterValidationError) as exc_info:
        parser.parse(["all", ["has", ["get", "name"], "extra"]])
    assert "must have 2 elements" in str(exc_info.value)


def test_special_characters_in_string(parser):
    expression = ["all", ["==", ["get", "name"], 'Test\'s "quoted" value']]
    result = parser.parse(expression)
    assert result == ("all", [("name", "eq", 'Test\'s "quoted" value')])


def test_unicode_in_string(parser):
    expression = ["all", ["==", ["get", "name"], "Тест А́ а́, Е́ е́, Ё́ ё́, Ѓ ѓ,"]]
    result = parser.parse(expression)
    assert result == ("all", [("name", "eq", "Тест А́ а́, Е́ е́, Ё́ ё́, Ѓ ѓ,")])


def test_very_large_number(parser):
    expression = ["all", ["==", ["get", "count"], 9007199254740991]]
    result = parser.parse(expression)
    assert result == ("all", [("count", "eq", 9007199254740991)])


def test_scientific_notation(parser):
    expression = ["all", ["==", ["get", "rating"], 1.5e-10]]
    result = parser.parse(expression)
    assert result == ("all", [("rating", "eq", 1.5e-10)])


def test_mixed_types_in_array(parser):
    expression = ["all", ["in", ["get", "name"], ["Alice", 42, 3.14, True]]]
    result = parser.parse(expression)
    assert result == ("all", [("name", "in", "Alice,42,3.14,True")])


def test_empty_string_value(parser):
    expression = ["all", ["==", ["get", "name"], ""]]
    result = parser.parse(expression)
    assert result == ("all", [("name", "eq", "")])


def test_whitespace_string_value(parser):
    expression = ["all", ["==", ["get", "name"], "   "]]
    result = parser.parse(expression)
    assert result == ("all", [("name", "eq", "   ")])


def test_multiple_nested_groups_at_top_level(parser):
    expression = [
        "all",
        [
            "all",
            ["==", ["get", "name"], "primary"],
            ["==", ["get", "price"], 60],
        ],
        [
            "all",
            ["==", ["get", "name"], "primary"],
            ["==", ["get", "price"], 90],
        ],
    ]
    result = parser.parse(expression)
    expected = (
        "all",
        [
            (
                "all",
                [
                    ("name", "eq", "primary"),
                    ("price", "eq", 60),
                ],
            ),
            (
                "all",
                [
                    ("name", "eq", "primary"),
                    ("price", "eq", 90),
                ],
            ),
        ],
    )
    assert result == expected


def test_date_field_filtering(parser):
    """Test filtering by DATE field."""
    expression = ["all", ["<", ["get", "date_created"], "2023-01-01"]]
    result = parser.parse(expression)
    expected = ("all", [("date_created", "lt", "2023-01-01")])
    assert result == expected


def test_date_equality(parser):
    """Test equality filter on DATE field."""
    expression = ["all", ["==", ["get", "date_created"], "2023-05-15"]]
    result = parser.parse(expression)
    expected = ("all", [("date_created", "eq", "2023-05-15")])
    assert result == expected


def test_date_range(parser):
    """Test date range filtering."""
    expression = [
        "all",
        [">=", ["get", "date_created"], "2023-01-01"],
        ["<", ["get", "date_created"], "2023-12-31"],
    ]
    result = parser.parse(expression)
    expected = (
        "all",
        [
            ("date_created", "ge", "2023-01-01"),
            ("date_created", "lt", "2023-12-31"),
        ],
    )
    assert result == expected


def test_datetime_field_filtering(parser):
    """Test filtering by DATETIME field."""
    expression = ["all", [">", ["get", "updated_at"], "2023-03-15T10:30:00"]]
    result = parser.parse(expression)
    expected = ("all", [("updated_at", "gt", "2023-03-15T10:30:00")])
    assert result == expected


def test_datetime_equality(parser):
    """Test equality filter on DATETIME field."""
    expression = ["all", ["==", ["get", "updated_at"], "2023-01-10T08:30:00"]]
    result = parser.parse(expression)
    expected = ("all", [("updated_at", "eq", "2023-01-10T08:30:00")])
    assert result == expected


def test_datetime_range(parser):
    """Test datetime range filtering."""
    expression = [
        "all",
        [">=", ["get", "updated_at"], "2023-01-01T00:00:00"],
        ["<", ["get", "updated_at"], "2023-02-01T00:00:00"],
    ]
    result = parser.parse(expression)
    expected = (
        "all",
        [
            ("updated_at", "ge", "2023-01-01T00:00:00"),
            ("updated_at", "lt", "2023-02-01T00:00:00"),
        ],
    )
    assert result == expected


def test_time_field_filtering(parser):
    """Test filtering by TIME field."""
    expression = ["all", ["<", ["get", "time_start"], "09:00:00"]]
    result = parser.parse(expression)
    expected = ("all", [("time_start", "lt", "09:00:00")])
    assert result == expected


def test_time_equality(parser):
    """Test equality filter on TIME field."""
    expression = ["all", ["==", ["get", "time_start"], "14:30:00"]]
    result = parser.parse(expression)
    expected = ("all", [("time_start", "eq", "14:30:00")])
    assert result == expected


def test_time_range(parser):
    """Test time range filtering."""
    expression = [
        "all",
        [">=", ["get", "time_start"], "08:00:00"],
        ["<=", ["get", "time_start"], "17:00:00"],
    ]
    result = parser.parse(expression)
    expected = (
        "all",
        [
            ("time_start", "ge", "08:00:00"),
            ("time_start", "le", "17:00:00"),
        ],
    )
    assert result == expected


def test_mixed_date_and_other_fields(parser):
    """Test combining date filter with other field types."""
    expression = [
        "all",
        ["==", ["get", "name"], "test"],
        [">", ["get", "date_created"], "2023-01-01"],
        [">", ["get", "price"], 100],
    ]
    result = parser.parse(expression)
    expected = (
        "all",
        [
            ("name", "eq", "test"),
            ("date_created", "gt", "2023-01-01"),
            ("price", "gt", 100),
        ],
    )
    assert result == expected


def test_nested_groups_with_datetime(parser):
    """Test nested groups with datetime filtering."""
    expression = [
        "all",
        ["==", ["get", "name"], "test"],
        [
            "any",
            ["<", ["get", "updated_at"], "2023-01-01T00:00:00"],
            [">", ["get", "updated_at"], "2023-12-31T23:59:59"],
        ],
    ]
    result = parser.parse(expression)
    expected = (
        "all",
        [
            ("name", "eq", "test"),
            (
                "any",
                [
                    ("updated_at", "lt", "2023-01-01T00:00:00"),
                    ("updated_at", "gt", "2023-12-31T23:59:59"),
                ],
            ),
        ],
    )
    assert result == expected
