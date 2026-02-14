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


def compile_clause(clause):
    return str(clause.compile(compile_kwargs={"literal_binds": True}))


@pytest.mark.parametrize("expression, expected_sql", get_parser_cases())
def test_expressions(parser, columns, expression, expected_sql):
    program = parser.parse(expression)
    clause = program.to_clause(columns)

    if clause is not None:
        assert compile_clause(clause) == expected_sql
    else:
        assert expected_sql is None


@pytest.mark.parametrize("expression, expected_sql", get_parser_cases(only_auto_all=True))
def test_expressions_with_auto_all(parser, columns, expression, expected_sql):
    program = parser.parse(["all", expression])
    clause = program.to_clause(columns)
    assert compile_clause(clause) == expected_sql


@pytest.mark.parametrize("case", get_invalid_parser_cases())
def test_invalid_parser_cases(parser, auto_all, case):
    expr = auto_all(case.expression) if case.auto_all else case.expression
    with pytest.raises(FilterExpressionError):
        parser.parse(expr)


def test_empty_expression(parser, columns):
    program = parser.parse([])
    assert program.to_clause(columns) is None


def test_compiler_unknown_node(parser, columns):
    class FakeNode(FilterNode):
        pass

    program = FilterProgram(FakeNode())
    with pytest.raises(NotImplementedError, match="Unknown node type"):
        program.to_clause(columns)


def test_compiler_missing_column(parser):
    columns = {}
    program = parser.parse(["==", ["get", "name"], "val"])
    with pytest.raises(FilterExpressionError):
        program.to_clause(columns)


def test_converters_native_types():
    f = FieldInfo("d", FIELD_TYPE.DATE)
    d = date(2023, 1, 1)
    assert _convert_scalar(f, d) == d


def test_get_supported_operators():
    operators = sorted(FilterParser.get_supported_operators())
    expected = sorted(
        [
            "all",
            "any",
            "==",
            "!=",
            ">",
            ">=",
            "<",
            "<=",
            "in",
            "!in",
            "has",
            "!has",
        ]
    )
    assert operators == expected
