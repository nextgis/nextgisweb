from types import SimpleNamespace

import pytest

from nextgisweb.feature_layer.interface import FID_KEY
from nextgisweb.feature_layer.sort import SortExpressionError, parse_sort


def make_resource(field_specs):
    return SimpleNamespace(
        fields=[
            SimpleNamespace(
                keyname=key,
                datatype=datatype,
                id=None,
                text_search=True,
                lookup_table_id=None,
            )
            for key, datatype in field_specs
        ]
    )


@pytest.fixture
def resource():
    return make_resource([("name", "STRING"), ("age", "INTEGER")])


def test_parse_fid(resource):
    assert parse_sort(resource, '[["desc", ["fid"]]]') == [("desc", FID_KEY)]


def test_parse_field(resource):
    assert parse_sort(resource, '[["asc", ["get", "name"]]]') == [("asc", "name")]


def test_parse_multiple(resource):
    raw = '[["asc", ["get", "name"]], ["desc", ["fid"]]]'
    assert parse_sort(resource, raw) == [("asc", "name"), ("desc", FID_KEY)]


def test_parse_field_named_as_id_is_not_feature_id():
    resource = make_resource([("id", "INTEGER")])
    assert parse_sort(resource, '[["asc", ["get", "id"]]]') == [("asc", "id")]
    assert parse_sort(resource, '[["asc", ["fid"]]]') == [("asc", FID_KEY)]
    assert FID_KEY != "id"


def test_fid_key_is_not_a_keyname():
    assert not isinstance(FID_KEY, str)


def test_parse_empty(resource):
    assert parse_sort(resource, "[]") == []


def test_parse_invalid_json(resource):
    with pytest.raises(SortExpressionError):
        parse_sort(resource, "{")


def test_parse_not_a_list(resource):
    with pytest.raises(SortExpressionError):
        parse_sort(resource, '{"dir": "desc"}')


def test_parse_item_not_a_list(resource):
    with pytest.raises(SortExpressionError):
        parse_sort(resource, '["desc"]')


def test_parse_invalid_direction(resource):
    with pytest.raises(SortExpressionError):
        parse_sort(resource, '[["sideways", ["fid"]]]')


def test_parse_extra_operands(resource):
    with pytest.raises(SortExpressionError):
        parse_sort(resource, '[["asc", ["fid"], "extra"]]')


def test_parse_literal_operand(resource):
    with pytest.raises(SortExpressionError):
        parse_sort(resource, '[["asc", "name"]]')


def test_parse_condition_expression(resource):
    with pytest.raises(SortExpressionError):
        parse_sort(resource, '[["asc", ["==", ["get", "name"], "Alice"]]]')


def test_parse_logical_expression(resource):
    with pytest.raises(SortExpressionError):
        parse_sort(resource, '[["asc", ["any", ["get", "name"]]]]')


def test_parse_fid_with_operands(resource):
    with pytest.raises(SortExpressionError):
        parse_sort(resource, '[["asc", ["fid", 1]]]')


def test_parse_unknown_field(resource):
    with pytest.raises(SortExpressionError):
        parse_sort(resource, '[["asc", ["get", "nonexistent"]]]')
