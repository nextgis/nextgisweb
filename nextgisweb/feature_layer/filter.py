import json
from typing import List, Literal, Union

from msgspec import Struct

from nextgisweb.env import gettext

from nextgisweb.core.exception import ValidationError

LogicalOp = Literal["all", "any"]
ComparisonOp = Literal["==", "!=", ">", "<", ">=", "<="]
InOp = Literal["in", "!in"]
HasOp = Literal["has", "!has"]


class GetExpr(Struct, array_like=True, forbid_unknown_fields=True):
    op: Literal["get"]
    field: str


ConditionValue = Union[str, int, float, bool, None]


class EqNeExpr(Struct, array_like=True, forbid_unknown_fields=True):
    op: Literal["==", "!="]
    get: GetExpr
    value: ConditionValue


class CmpExpr(Struct, array_like=True, forbid_unknown_fields=True):
    op: Literal[">", "<", ">=", "<="]
    get: GetExpr
    value: Union[int, float, str]


class InExpr(Struct, array_like=True, forbid_unknown_fields=True):
    op: Literal["in", "!in"]
    get: GetExpr
    values: List[Union[str, int, float]]


class HasExpr(Struct, array_like=True, forbid_unknown_fields=True):
    op: Literal["has", "!has"]
    get: GetExpr


ConditionExpr = Union[EqNeExpr, CmpExpr, InExpr, HasExpr]

GroupExpr = tuple[LogicalOp, list]

FilterExpression = Union[List, GroupExpr]


class FilterValidationError(ValidationError):
    title = gettext("Invalid filter expression")

    def __init__(self, message, detail=None):
        super().__init__(message=message, detail=detail)


class FilterParser:
    """Converts filter in MapLibre expressions to internal filter format."""

    OPERATOR_MAP = {
        "==": "eq",
        "!=": "ne",
        ">": "gt",
        "<": "lt",
        ">=": "ge",
        "<=": "le",
        "in": "in",
        "!in": "notin",
    }

    def __init__(self, layer):
        self.layer = layer
        self._field_map = {f.keyname: f for f in layer.fields}

    def parse(self, expression: Union[str, List]) -> FilterExpression:
        if isinstance(expression, str):
            try:
                expression = json.loads(expression)
            except (json.JSONDecodeError, ValueError) as e:
                raise FilterValidationError(
                    gettext("Invalid JSON in filter parameter"), detail=str(e)
                )

        if not isinstance(expression, list):
            raise FilterValidationError(
                gettext("Filter must be an array"),
            )

        if len(expression) == 0:
            return []

        if expression[0] not in ("all", "any"):
            raise FilterValidationError(
                gettext("Filter expression must start with 'all' or 'any' operator")
            )

        return self._parse_group(expression)

    def _parse_group(self, expr: List):
        if not expr or expr[0] not in ("all", "any"):
            raise FilterValidationError(gettext("Group must start with 'all' or 'any'"))

        logical_op = expr[0]
        sub_items = []

        for sub_expr in expr[1:]:
            if not isinstance(sub_expr, list) or len(sub_expr) == 0:
                raise FilterValidationError(gettext("Invalid sub-expression in group"))

            if sub_expr[0] in ("all", "any"):
                sub_items.append(self._parse_group(sub_expr))
            else:
                sub_items.append(self._parse_condition(sub_expr))

        return (logical_op, sub_items)

    def _parse_condition(self, expr: List):
        if not expr:
            raise FilterValidationError(gettext("Empty condition expression"))

        operator = expr[0]

        if operator in ("==", "!=", ">", "<", ">=", "<="):
            return self._parse_comparison(expr)
        elif operator in ("in", "!in"):
            return self._parse_in(expr)
        elif operator in ("has", "!has"):
            return self._parse_has(expr)
        else:
            raise FilterValidationError(gettext("Unsupported operator: {op}").format(op=operator))

    def _parse_comparison(self, expr: List) -> tuple:
        if len(expr) != 3:
            raise FilterValidationError(gettext("Comparison expression must have 3 elements"))

        operator, get_expr, value = expr
        field = self._extract_field(get_expr)
        internal_op = self.OPERATOR_MAP.get(operator, operator)

        return (field, internal_op, value)

    def _parse_in(self, expr: List) -> tuple:
        if len(expr) != 3:
            raise FilterValidationError(gettext("'in' expression must have 3 elements"))

        operator, get_expr, values = expr
        field = self._extract_field(get_expr)

        if not isinstance(values, list):
            raise FilterValidationError(gettext("'in' operator requires array of values"))
        value_str = ",".join(str(v) for v in values)
        internal_op = self.OPERATOR_MAP.get(operator, operator)

        return (field, internal_op, value_str)

    def _parse_has(self, expr: List) -> tuple:
        if len(expr) != 2:
            raise FilterValidationError(gettext("'has' expression must have 2 elements"))

        operator, get_expr = expr
        field = self._extract_field(get_expr)
        value = "no" if operator == "has" else "yes"
        return (field, "isnull", value)

    def _extract_field(self, get_expr) -> str:
        if not isinstance(get_expr, list) or len(get_expr) != 2:
            raise FilterValidationError(gettext("Invalid 'get' expression format"))

        if get_expr[0] != "get":
            raise FilterValidationError(
                gettext("Expected 'get' operator, got: {op}").format(op=get_expr[0])
            )

        field = get_expr[1]

        if field not in self._field_map:
            raise FilterValidationError(gettext("Unknown field: {field}").format(field=field))

        return field
