from datetime import date

import pytest

from ..filter import (
    FIELD_TYPE,
    FieldInfo,
    FilterExpressionError,
    FilterNode,
    FilterParser,
    FilterProgram,
    _convert_scalar,
)
from .filter_cases import (
    FILTER_FIELDS,
    FILTER_SQL_COLUMNS,
    FILTER_VIRTUAL_SQL_COLUMNS,
    get_invalid_parser_cases,
    get_parser_cases,
)


@pytest.fixture(params=[lambda e: e, lambda e: ["all", e]], ids=["raw", "all_wrapped"])
def auto_all(request):
    return request.param


@pytest.fixture
def parser():
    return FilterParser(FILTER_FIELDS)


@pytest.fixture
def columns():
    return FILTER_SQL_COLUMNS


@pytest.fixture
def virtual_operands():
    return FILTER_VIRTUAL_SQL_COLUMNS


def compile_clause(clause):
    return str(clause.compile(compile_kwargs={"literal_binds": True}))


@pytest.mark.parametrize("expression, expected_sql", get_parser_cases())
def test_expressions(parser, columns, virtual_operands, expression, expected_sql):
    program = parser.parse(expression)
    clause = program.to_clause(columns, virtual_operands)

    if clause is not None:
        assert compile_clause(clause) == expected_sql
    else:
        assert expected_sql is None


@pytest.mark.parametrize("expression, expected_sql", get_parser_cases(only_auto_all=True))
def test_expressions_with_auto_all(parser, columns, virtual_operands, expression, expected_sql):
    program = parser.parse(["all", expression])
    clause = program.to_clause(columns, virtual_operands)
    assert compile_clause(clause) == expected_sql


@pytest.mark.parametrize("case", get_invalid_parser_cases())
def test_invalid_parser_cases(parser, auto_all, case):
    expr = auto_all(case.expression) if case.auto_all else case.expression
    with pytest.raises(FilterExpressionError):
        parser.parse(expr)


def test_empty_expression(parser, columns, virtual_operands):
    program = parser.parse([])
    assert program.to_clause(columns, virtual_operands) is None


def test_compiler_unknown_node(parser, columns, virtual_operands):
    class FakeNode(FilterNode):
        pass

    program = FilterProgram(FakeNode())
    with pytest.raises(NotImplementedError, match="Unknown node type"):
        program.to_clause(columns, virtual_operands)


def test_compiler_missing_column(parser):
    columns = {}
    program = parser.parse(["==", ["get", "name"], "val"])
    with pytest.raises(FilterExpressionError):
        program.to_clause(columns, FILTER_VIRTUAL_SQL_COLUMNS)


def test_compiler_missing_virtual_operand(parser, columns):
    program = parser.parse(["==", ["fid"], 1])
    with pytest.raises(FilterExpressionError):
        program.to_clause(columns, {})


def test_converters_native_types():
    f = FieldInfo("d", FIELD_TYPE.DATE)
    d = date(2023, 1, 1)
    assert _convert_scalar(f.datatype, d) == d


def test_get_supported_operators():
    operators = set(FilterParser.get_supported_operators())
    expected = {
        "!=",
        "!ilike",
        "!in",
        "!is_null",
        "<",
        "<=",
        "==",
        ">",
        ">=",
        "all",
        "any",
        "fid",
        "get",
        "ilike",
        "in",
        "is_null",
        "like",
        "text_search",
    }
    assert operators == expected


def _search_parser():
    return FilterParser(
        [
            FieldInfo(key="name", datatype=FIELD_TYPE.STRING),
            FieldInfo(key="city", datatype=FIELD_TYPE.STRING),
        ]
    )


@pytest.mark.parametrize(
    "expression, expected_value, expected_case_sensitive",
    [
        (["text_search", "NYC"], "NYC", False),
        (["text_search", "NYC", {}], "NYC", False),
        (["text_search", "NYC", {"case_sensitive": True}], "NYC", True),
        (["text_search", "nyc", {"case_sensitive": False}], "nyc", False),
        (["text_search", "NYC", {"case_sensitive": False, "other": 1}], "NYC", False),
    ],
)
def test_text_search_spec(expression, expected_value, expected_case_sensitive):
    spec = _search_parser().parse(expression).text_search_spec
    assert spec is not None
    assert spec.value == expected_value
    assert spec.case_sensitive == expected_case_sensitive


def test_text_search_spec_nested():
    program = _search_parser().parse(["all", [">", ["get", "name"], "a"], ["text_search", "NYC"]])
    spec = program.text_search_spec
    assert spec is not None
    assert spec.value == "NYC"


def test_text_search_spec_absent():
    spec = _search_parser().parse(["all", [">", ["get", "name"], "a"]]).text_search_spec
    assert spec is None


def test_text_search_spec_multiple_first_wins():
    program = _search_parser().parse(
        ["any", ["text_search", "SF"], ["text_search", "c", {"case_sensitive": True}]]
    )
    spec = program.text_search_spec
    assert spec is not None
    assert spec.value == "SF"
    assert spec.case_sensitive is False


def test_text_search_compile(columns, virtual_operands):
    parser = _search_parser()
    cols = {key: columns[key] for key in ("name", "city")}
    clause = parser.parse(["text_search", "NYC"]).to_clause(cols, virtual_operands)
    assert (
        compile_clause(clause)
        == "lower(CAST(name AS TEXT)) LIKE lower('%NYC%') OR lower(CAST(city AS TEXT)) LIKE lower('%NYC%')"
    )


def test_text_search_compile_case_sensitive(columns, virtual_operands):
    parser = _search_parser()
    cols = {key: columns[key] for key in ("name", "city")}
    clause = parser.parse(["text_search", "NYC", {"case_sensitive": True}]).to_clause(
        cols, virtual_operands
    )
    assert (
        compile_clause(clause)
        == "CAST(name AS TEXT) LIKE '%NYC%' OR CAST(city AS TEXT) LIKE '%NYC%'"
    )


def test_text_search_no_searchable_fields(columns, virtual_operands):
    parser = FilterParser([FieldInfo(key="name", datatype=FIELD_TYPE.STRING, text_search=False)])
    clause = parser.parse(["text_search", "NYC"]).to_clause(
        {"name": columns["name"]}, virtual_operands
    )
    assert compile_clause(clause) == "false"


def test_text_search_compile_multiple(columns, virtual_operands):
    parser = _search_parser()
    cols = {key: columns[key] for key in ("name", "city")}
    clause = parser.parse(["any", ["text_search", "SF"], ["text_search", "c"]]).to_clause(
        cols, virtual_operands
    )
    assert (
        compile_clause(clause)
        == "lower(CAST(name AS TEXT)) LIKE lower('%SF%') OR lower(CAST(city AS TEXT)) LIKE lower('%SF%') "
        "OR lower(CAST(name AS TEXT)) LIKE lower('%c%') OR lower(CAST(city AS TEXT)) LIKE lower('%c%')"
    )
