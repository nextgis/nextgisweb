import pytest

from nextgisweb.feature_layer.filter import FilterExpressionError
from nextgisweb.postgis import PostgisLayer

pytestmark = pytest.mark.usefixtures("ngw_resource_defaults", "ngw_auth_administrator")


def load_layer(layer_id):
    return PostgisLayer.filter_by(id=layer_id).one()


def fetch_filtered_ids(resource, expression):
    query = resource.feature_query()
    program = resource.filter_parser.parse(expression)
    query.set_filter_program(program)
    return [feature.id for feature in query()]


def fetch_filtered_ids_from_string(resource, expression):
    query = resource.feature_query()
    program = resource.filter_parser.parse(expression)
    query.set_filter_program(program)
    return [feature.id for feature in query()]


@pytest.fixture
def layer(postgis_filter_layer_id):
    return load_layer(postgis_filter_layer_id)


def test_filter_all_single_condition(layer):
    ids = fetch_filtered_ids(layer, ["all", ["==", ["get", "name"], "Alice"]])
    assert ids == [1]


def test_filter_all_multiple_conditions(layer):
    ids = fetch_filtered_ids(
        layer,
        ["all", ["==", ["get", "city"], "NYC"], [">", ["get", "age"], 26]],
    )
    assert ids == [3, 5]


def test_filter_any_multiple_conditions(layer):
    ids = fetch_filtered_ids(
        layer,
        ["any", ["==", ["get", "name"], "Alice"], ["==", ["get", "name"], "Bob"]],
    )
    assert ids == [1, 2]


def test_filter_nested_groups(layer):
    ids = fetch_filtered_ids(
        layer,
        [
            "all",
            ["==", ["get", "city"], "NYC"],
            ["any", ["<", ["get", "age"], 27], [">", ["get", "age"], 33]],
        ],
    )
    assert ids == [1, 3]


def test_filter_comparison_operators(layer):
    assert fetch_filtered_ids(layer, ["all", [">", ["get", "age"], 30]]) == [3, 5]
    assert fetch_filtered_ids(layer, ["all", [">=", ["get", "score"], 8.0]]) == [1, 3, 5]
    assert fetch_filtered_ids(layer, ["all", ["<", ["get", "age"], 30]]) == [1, 4]
    assert fetch_filtered_ids(layer, ["all", ["!=", ["get", "city"], "NYC"]]) == [2, 4]


def test_filter_in_operator(layer):
    ids = fetch_filtered_ids(
        layer,
        ["all", ["in", ["get", "name"], ["Alice", "Bob", "Charlie"]]],
    )
    assert ids == [1, 2, 3]


def test_filter_not_in_operator(layer):
    ids = fetch_filtered_ids(
        layer,
        ["all", ["!in", ["get", "city"], ["NYC", "LA"]]],
    )
    assert ids == [4]


def test_filter_complex_nested(layer):
    ids = fetch_filtered_ids(
        layer,
        [
            "all",
            [">", ["get", "age"], 26],
            [
                "any",
                ["all", ["==", ["get", "city"], "NYC"], [">=", ["get", "score"], 8.5]],
                ["==", ["get", "city"], "LA"],
            ],
        ],
    )
    assert ids == [2, 3]


def test_filter_empty_expression(layer):
    ids = fetch_filtered_ids(layer, [])
    assert ids == [1, 2, 3, 4, 5]


def test_filter_json_string_expression(layer):
    ids = fetch_filtered_ids_from_string(layer, ["all", ["==", ["get", "city"], "SF"]])
    assert ids == [4]


def test_filter_date_field(layer):
    ids = fetch_filtered_ids(layer, ["all", ["<", ["get", "birth_date"], "1995-01-01"]])
    assert ids == [2, 3, 5]


def test_filter_date_equality(layer):
    ids = fetch_filtered_ids(layer, ["all", ["==", ["get", "birth_date"], "1998-05-15"]])
    assert ids == [1]


def test_filter_datetime_field(layer):
    ids = fetch_filtered_ids(
        layer,
        ["all", [">", ["get", "created_at"], "2023-03-01T00:00:00"]],
    )
    assert ids == [3, 5]


def test_filter_datetime_range(layer):
    ids = fetch_filtered_ids(
        layer,
        [
            "all",
            [">=", ["get", "created_at"], "2023-01-01T00:00:00"],
            ["<", ["get", "created_at"], "2023-02-01T00:00:00"],
        ],
    )
    assert ids == [1, 4]


def test_filter_time_field(layer):
    ids = fetch_filtered_ids(layer, ["all", ["<", ["get", "work_start"], "09:00:00"]])
    assert ids == [3, 5]


def test_filter_time_equality(layer):
    ids = fetch_filtered_ids(layer, ["all", ["==", ["get", "work_start"], "09:00:00"]])
    assert ids == [1]


def test_filter_mixed_date_and_string(layer):
    ids = fetch_filtered_ids(
        layer,
        [
            "all",
            ["==", ["get", "city"], "NYC"],
            [">", ["get", "birth_date"], "1990-01-01"],
        ],
    )
    assert ids == [1, 5]


def test_filter_invalid_format(layer):
    with pytest.raises(FilterExpressionError):
        fetch_filtered_ids(layer, ["unsupported", ["get", "name"], "Alice"])


def test_filter_invalid_json(layer):
    with pytest.raises(FilterExpressionError):
        layer.filter_parser.parse("not valid json {")


def test_filter_unknown_field(layer):
    with pytest.raises(FilterExpressionError):
        fetch_filtered_ids(layer, ["all", ["==", ["get", "nonexistent"], "value"]])
