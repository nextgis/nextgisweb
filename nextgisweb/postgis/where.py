import re
from collections.abc import Iterable, Iterator
from functools import lru_cache
from typing import NamedTuple

from msgspec import Struct, field
from pglast import Error as PgError
from pglast import ast, enums, parse_sql, scan

from nextgisweb.env import gettextf

from nextgisweb.core.exception import ValidationError

MAX_WHERE_LENGTH = 4096
WHERE_VALIDATION_CACHE_SIZE = 256

WHERE_FUNCTION_NAME_RE = re.compile(r"[a-z_][a-z0-9_]*")
WHERE_OPERATOR_NAME_RE = re.compile(r"[~!@#$%^&*+=`<>?|/-]+")


class WhereAllowlist(Struct, kw_only=True, forbid_unknown_fields=True):
    """Names allowed in addition to the built-in defaults."""

    functions: list[str] | None = field(default_factory=list)
    operators: list[str] | None = field(default_factory=list)


class ValidatedWhere(NamedTuple):
    expression: str
    functions: tuple[str, ...]
    operators: tuple[str, ...]


DEFAULT_WHERE_FUNCTIONS = frozenset(
    (
        "abs",
        "age",
        "array_length",
        "btrim",
        "ceil",
        "ceiling",
        "char_length",
        "coalesce",
        "concat",
        "concat_ws",
        "current_catalog",
        "current_date",
        "current_role",
        "current_schema",
        "current_time",
        "current_timestamp",
        "current_user",
        "date_part",
        "date_trunc",
        "floor",
        "greatest",
        "initcap",
        "jsonb_extract_path",
        "jsonb_extract_path_text",
        "jsonb_typeof",
        "least",
        "left",
        "length",
        "localtime",
        "localtimestamp",
        "lower",
        "lpad",
        "ltrim",
        "md5",
        "now",
        "nullif",
        "octet_length",
        "power",
        "repeat",
        "replace",
        "reverse",
        "right",
        "round",
        "rpad",
        "rtrim",
        "session_user",
        "split_part",
        "sqrt",
        "strpos",
        "substr",
        "substring",
        "to_char",
        "to_date",
        "to_number",
        "to_timestamp",
        "translate",
        "trim",
        "trunc",
        "upper",
        "user",
    )
)

# Some SQL functions have dedicated AST nodes instead of FuncCall. Map them to
# their SQL names so they are checked against the same function allowlist.
_MINMAX_FUNCTION_NAMES = {
    enums.MinMaxOp.IS_GREATEST: "greatest",
    enums.MinMaxOp.IS_LEAST: "least",
}

_SQL_VALUE_FUNCTION_NAMES = {
    enums.SQLValueFunctionOp.SVFOP_CURRENT_DATE: "current_date",
    enums.SQLValueFunctionOp.SVFOP_CURRENT_TIME: "current_time",
    enums.SQLValueFunctionOp.SVFOP_CURRENT_TIME_N: "current_time",
    enums.SQLValueFunctionOp.SVFOP_CURRENT_TIMESTAMP: "current_timestamp",
    enums.SQLValueFunctionOp.SVFOP_CURRENT_TIMESTAMP_N: "current_timestamp",
    enums.SQLValueFunctionOp.SVFOP_LOCALTIME: "localtime",
    enums.SQLValueFunctionOp.SVFOP_LOCALTIME_N: "localtime",
    enums.SQLValueFunctionOp.SVFOP_LOCALTIMESTAMP: "localtimestamp",
    enums.SQLValueFunctionOp.SVFOP_LOCALTIMESTAMP_N: "localtimestamp",
    enums.SQLValueFunctionOp.SVFOP_CURRENT_ROLE: "current_role",
    enums.SQLValueFunctionOp.SVFOP_CURRENT_USER: "current_user",
    enums.SQLValueFunctionOp.SVFOP_USER: "user",
    enums.SQLValueFunctionOp.SVFOP_SESSION_USER: "session_user",
    enums.SQLValueFunctionOp.SVFOP_CURRENT_CATALOG: "current_catalog",
    enums.SQLValueFunctionOp.SVFOP_CURRENT_SCHEMA: "current_schema",
}

DEFAULT_WHERE_OPERATORS = frozenset(
    (
        "=",
        "<>",
        "!=",
        "<",
        ">",
        "<=",
        ">=",
        "+",
        "-",
        "*",
        "/",
        "%",
        "^",
        "||",
    )
)

# Expression kinds like IN, LIKE and BETWEEN are grammar, not extensible
# operators, so they are always allowed. NULLIF is an exception: it is a
# function and is checked against the function allowlist in _validate_node().
_ALLOWED_EXPR_KINDS = frozenset(
    (
        enums.A_Expr_Kind.AEXPR_OP,
        enums.A_Expr_Kind.AEXPR_IN,
        enums.A_Expr_Kind.AEXPR_LIKE,
        enums.A_Expr_Kind.AEXPR_ILIKE,
        enums.A_Expr_Kind.AEXPR_BETWEEN,
        enums.A_Expr_Kind.AEXPR_NOT_BETWEEN,
        enums.A_Expr_Kind.AEXPR_BETWEEN_SYM,
        enums.A_Expr_Kind.AEXPR_NOT_BETWEEN_SYM,
        enums.A_Expr_Kind.AEXPR_DISTINCT,
        enums.A_Expr_Kind.AEXPR_NOT_DISTINCT,
        enums.A_Expr_Kind.AEXPR_NULLIF,
    )
)

# Grammar constructs (CASE, casts, IS NULL / IS TRUE, AND / OR / NOT) are
# sanctioned syntax rather than functions or operators: they carry no callable
# name to allowlist and are therefore always allowed. The remaining nodes are
# checked in _validate_node() against the function or operator allowlists.
_ALLOWED_NODES = frozenset(
    (
        ast.A_Const,
        ast.A_Expr,
        ast.Boolean,
        ast.BooleanTest,
        ast.BoolExpr,
        ast.CaseExpr,
        ast.CaseWhen,
        ast.CoalesceExpr,
        ast.ColumnRef,
        ast.Float,
        ast.FuncCall,
        ast.Integer,
        ast.MinMaxExpr,
        ast.NullTest,
        ast.SQLValueFunction,
        ast.String,
        ast.TypeCast,
        ast.TypeName,
    )
)

_FORBIDDEN_STMT_FIELDS = (
    "distinctClause",
    "intoClause",
    "groupClause",
    "havingClause",
    "windowClause",
    "valuesLists",
    "sortClause",
    "limitOffset",
    "limitCount",
    "lockingClause",
    "withClause",
    "larg",
    "rarg",
)

_COMMENT_TOKENS = frozenset(("SQL_COMMENT", "C_COMMENT"))


def _error(message: str, *args) -> ValidationError:
    return ValidationError(message=gettextf(message)(*args))


def _walk(node) -> Iterator[ast.Node]:
    if isinstance(node, ast.Node):
        yield node
        for name in node:
            yield from _walk(getattr(node, name, None))
    elif isinstance(node, (tuple, list)):
        for item in node:
            yield from _walk(item)


def _check_function(name: str | None, allowed_functions: frozenset[str], used_functions: set[str]):
    if name is None or name not in allowed_functions:
        raise _error("Function '{}' is not allowed in the WHERE expression.", name or "UNKNOWN")
    used_functions.add(name)


def _validate_node(
    node: ast.Node,
    allowed_functions: frozenset[str],
    allowed_operators: frozenset[str],
    used_functions: set[str],
    used_operators: set[str],
):
    if type(node) not in _ALLOWED_NODES:
        raise _error("Node '{}' is not allowed in the WHERE expression.", type(node).__name__)

    if isinstance(node, ast.A_Expr):
        kind = node.kind
        if kind not in _ALLOWED_EXPR_KINDS:
            raise _error(
                "Operator '{}' is not allowed in the WHERE expression.",
                kind.name if kind is not None else "OPERATOR",
            )

        if kind == enums.A_Expr_Kind.AEXPR_NULLIF:
            _check_function("nullif", allowed_functions, used_functions)
        elif kind == enums.A_Expr_Kind.AEXPR_OP:
            name = node.name or ()
            if len(name) != 1:
                raise _error("Operator '{}' is not allowed in the WHERE expression.", "OPERATOR")
            op = name[0].sval
            if op not in allowed_operators:
                raise _error("Operator '{}' is not allowed in the WHERE expression.", op)
            used_operators.add(op)

    elif isinstance(node, ast.ColumnRef):
        fields = node.fields or ()
        if (
            len(fields) != 2
            or not isinstance(fields[0], ast.String)
            or not isinstance(fields[1], ast.String)
            or fields[0].sval != "src"
        ):
            raise _error("Table columns in the WHERE expression must be prefixed with 'src.'.")

    elif isinstance(node, ast.FuncCall):
        if node.agg_star or node.agg_distinct or node.agg_filter or node.over:
            raise _error("Aggregate and window functions are not allowed in the WHERE expression.")

        funcname = node.funcname or ()
        if len(funcname) != 1 or not isinstance(funcname[0], ast.String):
            raise _error(
                "Function '{}' is not allowed in the WHERE expression.",
                ".".join(str(n.sval) for n in funcname),
            )
        _check_function(funcname[0].sval, allowed_functions, used_functions)

    elif isinstance(node, ast.CoalesceExpr):
        _check_function("coalesce", allowed_functions, used_functions)

    elif isinstance(node, ast.MinMaxExpr):
        _check_function(_MINMAX_FUNCTION_NAMES.get(node.op), allowed_functions, used_functions)

    elif isinstance(node, ast.SQLValueFunction):
        _check_function(_SQL_VALUE_FUNCTION_NAMES.get(node.op), allowed_functions, used_functions)


def validate_where_expression(
    expression: str,
    allowed_functions: Iterable[str],
    allowed_operators: Iterable[str] = DEFAULT_WHERE_OPERATORS,
) -> ValidatedWhere:
    expression = expression.strip()

    if not expression:
        raise _error("WHERE expression is empty.")

    if len(expression) > MAX_WHERE_LENGTH:
        raise _error(
            "WHERE expression is too long, maximum length is {} characters.", MAX_WHERE_LENGTH
        )

    try:
        tokens = scan(expression)
    except PgError:
        raise _error("Invalid WHERE expression.") from None

    if any(token.name in _COMMENT_TOKENS for token in tokens):
        raise _error("Comments are not allowed in the WHERE expression.")

    try:
        parsed = parse_sql(f"SELECT 1 FROM src WHERE TRUE AND ({expression})")
    except PgError:
        raise _error("Invalid WHERE expression.") from None

    if len(parsed) != 1:
        raise _error("Only a single WHERE expression is allowed.")

    stmt = parsed[0].stmt
    if not isinstance(stmt, ast.SelectStmt) or stmt.op != enums.SetOperation.SETOP_NONE:
        raise _error("Only a single WHERE expression is allowed.")

    target_list = stmt.targetList or ()
    if len(target_list) != 1 or not isinstance(target_list[0], ast.ResTarget):
        raise _error("Only a single WHERE expression is allowed.")

    for name in _FORBIDDEN_STMT_FIELDS:
        if getattr(stmt, name, None):
            raise _error("Only a single WHERE expression is allowed.")

    from_clause = stmt.fromClause or ()
    if (
        len(from_clause) != 1
        or not isinstance(from_clause[0], ast.RangeVar)
        or from_clause[0].schemaname is not None
        or from_clause[0].relname != "src"
    ):
        raise _error("Only a single WHERE expression is allowed.")

    where = stmt.whereClause
    if not isinstance(where, ast.BoolExpr) or where.boolop != enums.BoolExprType.AND_EXPR:
        raise _error("Only a single WHERE expression is allowed.")

    args = where.args or ()
    first = args[0] if args else None
    if not (
        isinstance(first, ast.A_Const) and isinstance(first.val, ast.Boolean) and first.val.boolval
    ):
        raise _error("Only a single WHERE expression is allowed.")

    allowed_functions = frozenset(name.lower() for name in allowed_functions)
    allowed_operators = frozenset(name.upper() for name in allowed_operators)
    used_functions: set[str] = set()
    used_operators: set[str] = set()

    for node in args[1:]:
        for child in _walk(node):
            _validate_node(
                child, allowed_functions, allowed_operators, used_functions, used_operators
            )

    return ValidatedWhere(
        expression,
        tuple(sorted(used_functions)),
        tuple(sorted(used_operators)),
    )


@lru_cache(maxsize=WHERE_VALIDATION_CACHE_SIZE)
def _validate_where_cached(
    expression: str, functions: tuple[str, ...], operators: tuple[str, ...]
) -> ValidatedWhere:
    return validate_where_expression(expression, functions, operators)


def validate_where_cached(
    expression: str,
    allowed_functions: Iterable[str],
    allowed_operators: Iterable[str],
) -> ValidatedWhere:
    """Validate a stored expression at query time, caching the result in the worker.

    The cache key includes the expression and the full contents of both
    allowlists. A changed allowlist or expression therefore cannot return a
    stale result, and no cross-transaction state is stored on the layer.
    """
    return _validate_where_cached(
        expression.strip(),
        tuple(sorted(set(name.lower() for name in allowed_functions))),
        tuple(sorted(set(name.upper() for name in allowed_operators))),
    )


validate_where_cached.cache_info = _validate_where_cached.cache_info
validate_where_cached.cache_clear = _validate_where_cached.cache_clear
