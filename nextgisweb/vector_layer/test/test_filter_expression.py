import json

import pytest

from nextgisweb.feature_layer.filter import FilterExpressionError
from nextgisweb.vector_layer import VectorLayer

pytestmark = pytest.mark.usefixtures("ngw_resource_defaults", "ngw_auth_administrator")


@pytest.fixture(scope="module")
def test_layer_id(vector_layer_filter_dataset):
    return vector_layer_filter_dataset


def fetch_filtered_ids(resource, filter):
    query = resource.feature_query()
    query.set_filter_program(resource.filter_parser.parse(filter))
    return [feature.id for feature in query()]


def fetch_filtered_ids_from_string(resource, filter):
    program = resource.filter_parser.parse(json.dumps(filter))
    query = resource.feature_query()
    query.set_filter_program(program)
    return [feature.id for feature in query()]


def load_layer(layer_id):
    return VectorLayer.filter_by(id=layer_id).one()


def test_filter_all_single_condition(test_layer_id):
    layer = load_layer(test_layer_id)
    filter = ["all", ["==", ["get", "name"], "Alice"]]

    ids = fetch_filtered_ids(layer, filter)

    assert ids == [1]


def test_filter_all_multiple_conditions(test_layer_id):
    layer = load_layer(test_layer_id)
    filter = ["all", ["==", ["get", "city"], "NYC"], [">", ["get", "age"], 26]]

    ids = fetch_filtered_ids(layer, filter)

    assert ids == [3, 5]


def test_filter_any_multiple_conditions(test_layer_id):
    layer = load_layer(test_layer_id)
    filter = [
        "any",
        ["==", ["get", "name"], "Alice"],
        ["==", ["get", "name"], "Bob"],
    ]

    ids = fetch_filtered_ids(layer, filter)

    assert ids == [1, 2]


def test_filter_nested_groups(test_layer_id):
    layer = load_layer(test_layer_id)
    filter = [
        "all",
        ["==", ["get", "city"], "NYC"],
        ["any", ["<", ["get", "age"], 27], [">", ["get", "age"], 33]],
    ]

    ids = fetch_filtered_ids(layer, filter)

    assert ids == [1, 3]


def test_filter_comparison_operators(test_layer_id):
    layer = load_layer(test_layer_id)

    assert fetch_filtered_ids(layer, ["all", [">", ["get", "age"], 30]]) == [3, 5]
    assert fetch_filtered_ids(layer, ["all", [">=", ["get", "score"], 8.0]]) == [1, 3, 5]
    assert fetch_filtered_ids(layer, ["all", ["<", ["get", "age"], 30]]) == [1, 4]
    assert fetch_filtered_ids(layer, ["all", ["!=", ["get", "city"], "NYC"]]) == [2, 4]


def test_filter_in_operator(test_layer_id):
    layer = load_layer(test_layer_id)
    filter = ["all", ["in", ["get", "name"], ["Alice", "Bob", "Charlie"]]]

    ids = fetch_filtered_ids(layer, filter)

    assert ids == [1, 2, 3]


def test_filter_not_in_operator(test_layer_id):
    layer = load_layer(test_layer_id)
    filter = ["all", ["!in", ["get", "city"], ["NYC", "LA"]]]

    ids = fetch_filtered_ids(layer, filter)

    assert ids == [4]


def test_filter_complex_nested(test_layer_id):
    layer = load_layer(test_layer_id)
    filter = [
        "all",
        [">", ["get", "age"], 26],
        [
            "any",
            ["all", ["==", ["get", "city"], "NYC"], [">=", ["get", "score"], 8.5]],
            ["==", ["get", "city"], "LA"],
        ],
    ]

    ids = fetch_filtered_ids(layer, filter)

    assert ids == [2, 3]


def test_filter_empty_expression(test_layer_id):
    layer = load_layer(test_layer_id)

    ids = fetch_filtered_ids(layer, [])

    assert ids == [1, 2, 3, 4, 5]


def test_filter_json_string_expression(test_layer_id):
    layer = load_layer(test_layer_id)
    filter = ["all", ["==", ["get", "city"], "SF"]]

    ids = fetch_filtered_ids_from_string(layer, filter)

    assert ids == [4]


def test_filter_date_field(test_layer_id):
    layer = load_layer(test_layer_id)
    filter = ["all", ["<", ["get", "birth_date"], "1995-01-01"]]

    ids = fetch_filtered_ids(layer, filter)

    assert ids == [2, 3, 5]


def test_filter_date_equality(test_layer_id):
    layer = load_layer(test_layer_id)
    filter = ["all", ["==", ["get", "birth_date"], "1998-05-15"]]

    ids = fetch_filtered_ids(layer, filter)

    assert ids == [1]


def test_filter_datetime_field(test_layer_id):
    layer = load_layer(test_layer_id)
    filter = ["all", [">", ["get", "created_at"], "2023-03-01T00:00:00"]]

    ids = fetch_filtered_ids(layer, filter)

    assert ids == [3, 5]


def test_filter_datetime_range(test_layer_id):
    layer = load_layer(test_layer_id)
    filter = [
        "all",
        [">=", ["get", "created_at"], "2023-01-01T00:00:00"],
        ["<", ["get", "created_at"], "2023-02-01T00:00:00"],
    ]

    ids = fetch_filtered_ids(layer, filter)

    assert ids == [1, 4]


def test_filter_time_field(test_layer_id):
    layer = load_layer(test_layer_id)
    filter = ["all", ["<", ["get", "work_start"], "09:00:00"]]

    ids = fetch_filtered_ids(layer, filter)

    assert ids == [3, 5]


def test_filter_time_equality(test_layer_id):
    layer = load_layer(test_layer_id)
    filter = ["all", ["==", ["get", "work_start"], "09:00:00"]]

    ids = fetch_filtered_ids(layer, filter)

    assert ids == [1]


def test_filter_mixed_date_and_string(test_layer_id):
    layer = load_layer(test_layer_id)
    filter = [
        "all",
        ["==", ["get", "city"], "NYC"],
        [">", ["get", "birth_date"], "1990-01-01"],
    ]

    ids = fetch_filtered_ids(layer, filter)

    assert ids == [1, 5]


def test_filter_invalid_format(test_layer_id):
    layer = load_layer(test_layer_id)

    with pytest.raises(FilterExpressionError):
        fetch_filtered_ids(layer, ["unsupported", ["get", "name"], "Alice"])


def test_filter_invalid_json(test_layer_id):
    layer = load_layer(test_layer_id)

    with pytest.raises(FilterExpressionError):
        layer.filter_parser.parse("not valid json {")


def test_filter_unknown_field(test_layer_id):
    layer = load_layer(test_layer_id)

    with pytest.raises(FilterExpressionError):
        fetch_filtered_ids(layer, ["all", ["==", ["get", "nonexistent"], "value"]])
