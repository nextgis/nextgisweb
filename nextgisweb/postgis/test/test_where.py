import re

import pytest

from nextgisweb.core.exception import ValidationError

from ..where import (
    DEFAULT_WHERE_FUNCTIONS,
    DEFAULT_WHERE_OPERATORS,
    MAX_WHERE_LENGTH,
    validate_where_cached,
    validate_where_expression,
)


@pytest.mark.parametrize(
    "expression, functions",
    (
        ("src.age > 30", ()),
        ("src.age > 30 AND lower(src.name) = 'alice'", ("lower",)),
        ("src.name LIKE 'A%'", ()),
        ("src.name ILIKE 'a%'", ()),
        ("src.id IN (1, 2, 3)", ()),
        ("src.age BETWEEN 1 AND 5", ()),
        ("src.name NOT BETWEEN 'a' AND 'b'", ()),
        ("src.value IS NULL", ()),
        ("src.value IS NOT TRUE", ()),
        ("src.a IS DISTINCT FROM src.b", ()),
        ("CURRENT_DATE > src.created_at", ("current_date",)),
        ("CASE WHEN src.active THEN 1 ELSE 2 END = 1", ()),
        ("src.name::text = 'alice'", ()),
        ("coalesce(src.name, '') = ''", ("coalesce",)),
        ("greatest(src.a, src.b) > 0", ("greatest",)),
        ("least(src.a, src.b) > 0", ("least",)),
        ("NULLIF(src.a, 1) = 2", ("nullif",)),
        ("NOT (src.a = 1 OR src.b < 2)", ()),
        ("src.a = 1 OR src.b = 2", ()),
        ("lower(src.name) = 'alice' AND upper(src.city) = 'NYC'", ("lower", "upper")),
        ("src.name = 'value -- not a comment'", ()),
        ("src.name = 'value /* not a comment */'", ()),
    ),
)
def test_valid(expression, functions):
    validated = validate_where_expression(expression, DEFAULT_WHERE_FUNCTIONS)
    assert validated.expression == expression
    assert validated.functions == functions


def test_custom_function():
    with pytest.raises(ValidationError, match=re.escape("Function 'my_func' is not allowed")):
        validate_where_expression("my_func(src.a) = 1", DEFAULT_WHERE_FUNCTIONS)

    validated = validate_where_expression(
        "my_func(src.a) = 1", (*DEFAULT_WHERE_FUNCTIONS, "my_func")
    )
    assert validated.expression == "my_func(src.a) = 1"
    assert validated.functions == ("my_func",)


def test_custom_operator():
    with pytest.raises(ValidationError, match=re.escape("Operator '~' is not allowed")):
        validate_where_expression("src.a ~ 'x.*'", DEFAULT_WHERE_FUNCTIONS)

    validated = validate_where_expression(
        "src.a ~ 'x.*'", DEFAULT_WHERE_FUNCTIONS, (*DEFAULT_WHERE_OPERATORS, "~")
    )
    assert validated.operators == ("~",)

    validated = validate_where_expression(
        "src.a !~* 'x'", DEFAULT_WHERE_FUNCTIONS, (*DEFAULT_WHERE_OPERATORS, "!~*")
    )
    assert validated.operators == ("!~*",)


@pytest.mark.parametrize(
    "expression, name",
    (
        ("coalesce(src.a, 0) = 1", "coalesce"),
        ("greatest(src.a, src.b) > 0", "greatest"),
        ("least(src.a, src.b) > 0", "least"),
        ("CURRENT_DATE > src.a", "current_date"),
        ("CURRENT_TIMESTAMP > src.a", "current_timestamp"),
        ("LOCALTIME > src.a", "localtime"),
        ("CURRENT_USER = 'x'", "current_user"),
        ("NULLIF(src.a, 1) = 2", "nullif"),
    ),
)
def test_function_like_nodes_require_allowlist(expression, name):
    # PostgreSQL parses these as dedicated AST nodes rather than FuncCall,
    # but they are functions and must still pass the function allowlist.
    with pytest.raises(ValidationError, match=re.escape(f"Function '{name}' is not allowed")):
        validate_where_expression(expression, ())

    validated = validate_where_expression(expression, (name,))
    assert validated.functions == (name,)


@pytest.mark.parametrize(
    "expression",
    (
        "CASE WHEN src.a THEN 1 ELSE 2 END = 1",
        "src.a::text = 'x'",
        "CAST(src.a AS text) = 'x'",
        "src.a IS NULL",
        "src.a IS NOT NULL",
        "src.a IS TRUE",
        "src.a IS UNKNOWN",
        "NOT (src.a = 1 OR src.b < 2)",
        "src.a IS DISTINCT FROM src.b",
    ),
)
def test_syntax_constructs_allowed_without_allowlist(expression):
    # CASE, casts, IS NULL / IS TRUE and boolean operators are grammar, not
    # callable functions or operators, so they need no allowlist entries.
    validated = validate_where_expression(expression, ())
    assert validated.functions == ()


@pytest.mark.parametrize(
    "expression",
    (
        "src.id IN (1, 2)",
        "src.name LIKE 'x%'",
        "src.name ILIKE 'x%'",
        "src.age BETWEEN 1 AND 5",
        "src.a IS DISTINCT FROM src.b",
    ),
)
def test_grammar_expr_kinds_allowed_without_allowlist(expression):
    # IN, LIKE, ILIKE, BETWEEN and IS DISTINCT FROM are parser-level grammar
    # rather than extensible operators, so they need no operator allowlist entry.
    validated = validate_where_expression(expression, (), ())
    assert validated.operators == ()


@pytest.mark.parametrize(
    "expression, message",
    (
        ("", "WHERE expression is empty"),
        ("   ", "WHERE expression is empty"),
        ("src.a = 1 -- comment", "Comments are not allowed"),
        ("src.a = 1 /* comment */", "Comments are not allowed"),
        ("/*", "Invalid WHERE expression"),
        ("'unterminated", "Invalid WHERE expression"),
        ("unknown_func(src.a) = 1", "Function 'unknown_func' is not allowed"),
        ("pg_catalog.lower(src.a) = 'x'", "is not allowed"),
        ("count(*) > 1", "Aggregate and window functions are not allowed"),
        ("\"LOWER\"(src.a) = 'x'", "Function 'LOWER' is not allowed"),
        ("src.a ~ 'x.*'", "Operator '~' is not allowed"),
        ("src.a ~* 'x.*'", "Operator '~*' is not allowed"),
        ("src.a !~ 'x.*'", "Operator '!~' is not allowed"),
        ("src.a SIMILAR TO 'x'", "Operator 'AEXPR_SIMILAR' is not allowed"),
        ("src.a = ANY(ARRAY[1, 2])", "Operator 'AEXPR_OP_ANY' is not allowed"),
        ("EXISTS (SELECT 1)", "Node 'SubLink' is not allowed"),
        ("src.id IN (SELECT 1)", "Node 'SubLink' is not allowed"),
        ("src.a = (SELECT 1)", "Node 'SubLink' is not allowed"),
        ("id > 30", "must be prefixed with 'src.'"),
        ("a.id > 30", "must be prefixed with 'src.'"),
        ("src.* = 1", "must be prefixed with 'src.'"),
        ("src.a = 1)", "Invalid WHERE expression"),
        ("src.a = 1; DROP TABLE x", "Invalid WHERE expression"),
        ("true) OR (true", "Only a single WHERE expression is allowed"),
        ("true) ORDER BY (1", "Only a single WHERE expression is allowed"),
        ("true) LIMIT (1", "Only a single WHERE expression is allowed"),
    ),
)
def test_invalid(expression, message):
    with pytest.raises(ValidationError, match=re.escape(message)):
        validate_where_expression(expression, DEFAULT_WHERE_FUNCTIONS)


def test_too_long():
    expression = "src.a = " + "1" * MAX_WHERE_LENGTH
    with pytest.raises(ValidationError, match="too long"):
        validate_where_expression(expression, DEFAULT_WHERE_FUNCTIONS)


def test_cached_validation():
    validate_where_cached.cache_clear()
    expression = "src.a = 1"

    first = validate_where_cached(expression, DEFAULT_WHERE_FUNCTIONS, DEFAULT_WHERE_OPERATORS)
    second = validate_where_cached(expression, DEFAULT_WHERE_FUNCTIONS, DEFAULT_WHERE_OPERATORS)
    assert first is second
    assert validate_where_cached.cache_info().hits >= 1

    # A different allowlist must not reuse the cached result.
    with_extra_function = validate_where_cached(
        expression, (*DEFAULT_WHERE_FUNCTIONS, "my_func"), DEFAULT_WHERE_OPERATORS
    )
    assert with_extra_function is not first

    # A cached failure must not hide a name that has since been allowed.
    with pytest.raises(ValidationError, match="Function 'my_func' is not allowed"):
        validate_where_cached(
            "my_func(src.a) = 1", DEFAULT_WHERE_FUNCTIONS, DEFAULT_WHERE_OPERATORS
        )
    allowed = validate_where_cached(
        "my_func(src.a) = 1",
        (*DEFAULT_WHERE_FUNCTIONS, "my_func"),
        DEFAULT_WHERE_OPERATORS,
    )
    assert allowed.functions == ("my_func",)

    # The expression itself is part of the cache key as well.
    other = validate_where_cached("src.b = 1", DEFAULT_WHERE_FUNCTIONS, DEFAULT_WHERE_OPERATORS)
    assert other is not first
