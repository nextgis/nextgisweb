from __future__ import annotations

import json
from dataclasses import dataclass
from datetime import date, datetime, time
from typing import Any, Callable, Dict, Iterable, List, Mapping, Sequence

import sqlalchemy as sa
from sqlalchemy.sql.elements import ClauseElement

from nextgisweb.env import gettext

from nextgisweb.core.exception import ValidationError

from .interface import FIELD_TYPE


def str_contains_filter(filter_str: str | None) -> bool:
    if not filter_str:
        return False
    try:
        data = json.loads(filter_str)
        if data in ({}, []):
            return False
        return True
    except (json.JSONDecodeError, TypeError):
        raise FilterExpressionError()


class FilterExpressionError(ValidationError):
    def __init__(self, *, data: Dict[str, Any] | None = None):
        super().__init__(message=gettext("Invalid filter expression"), data=data)


@dataclass(frozen=True)
class FieldInfo:
    key: str
    datatype: str

    def clause_cls(self):
        return ClauseElement


class FilterProgram:
    def __init__(self, root: "FilterNode | None"):
        self._root = root

    def to_clause(self, columns: Mapping[str, sa.sql.ColumnElement[Any]]) -> ClauseElement | None:
        if self._root is None:
            return None
        return self._root.to_clause(columns)


class FilterNode:
    def to_clause(self, columns: Mapping[str, sa.sql.ColumnElement[Any]]) -> ClauseElement | None:
        raise NotImplementedError


class LogicalNode(FilterNode):
    def __init__(self, operator: str, children: Sequence[FilterNode | None]):
        self.operator = operator
        self.children = tuple(child for child in children if child is not None)

    def to_clause(self, columns: Mapping[str, sa.sql.ColumnElement[Any]]) -> ClauseElement | None:
        compiled = [child.to_clause(columns) for child in self.children if child is not None]
        compiled = [expr for expr in compiled if expr is not None]

        if not compiled:
            return None

        if self.operator == "all":
            return sa.and_(*compiled)
        elif self.operator == "any":
            return sa.or_(*compiled)
        raise FilterExpressionError()


class ConditionNode(FilterNode):
    def __init__(self, operator: str, field: FieldInfo, value: Any):
        self.operator = operator
        self.field = field
        self.value = value

    def to_clause(self, columns: Mapping[str, sa.sql.ColumnElement[Any]]) -> ClauseElement | None:
        try:
            column = columns[self.field.key]
        except KeyError as exc:
            raise FilterExpressionError() from exc

        return _CONDITION_BUILDERS[self.operator](column, self.value)


def _ensure_list(value: Any) -> List[Any]:
    if isinstance(value, list):
        return value
    raise FilterExpressionError()


def _convert_scalar(field: FieldInfo, value: Any) -> Any:
    if value is None:
        return None

    datatype = field.datatype

    try:
        if datatype == FIELD_TYPE.INTEGER:
            if isinstance(value, bool):
                raise ValueError
            return int(value)
        if datatype == FIELD_TYPE.BIGINT:
            if isinstance(value, bool):
                raise ValueError
            return int(value)
        if datatype == FIELD_TYPE.REAL:
            if isinstance(value, bool):
                raise ValueError
            return float(value)
        if datatype == FIELD_TYPE.STRING:
            if isinstance(value, (str, int, float, bool)):
                return str(value)
            raise ValueError
        if datatype == FIELD_TYPE.DATE:
            if isinstance(value, date) and not isinstance(value, datetime):
                return value
            if isinstance(value, str):
                return date.fromisoformat(value)
            raise ValueError
        if datatype == FIELD_TYPE.TIME:
            if isinstance(value, time) and not isinstance(value, datetime):
                return value
            if isinstance(value, str):
                return time.fromisoformat(value)
            raise ValueError
        if datatype == FIELD_TYPE.DATETIME:
            if isinstance(value, datetime):
                return value
            if isinstance(value, str):
                return datetime.fromisoformat(value)
            raise ValueError
    except (TypeError, ValueError) as exc:
        raise FilterExpressionError() from exc

    raise FilterExpressionError()


def _convert_value(field: FieldInfo, operator: str, value: Any) -> Any:
    if operator in {"has", "!has"}:
        return None

    if operator in {"in", "!in"}:
        values = _ensure_list(value)
        return [_convert_scalar(field, item) for item in values]

    return _convert_scalar(field, value)


def _op_eq(column, value):
    if value is None:
        return column.is_(None)
    return column == value


def _op_ne(column, value):
    if value is None:
        return column.is_not(None)
    return column != value


def _op_gt(column, value):
    return column > value


def _op_ge(column, value):
    return column >= value


def _op_lt(column, value):
    return column < value


def _op_le(column, value):
    return column <= value


def _op_in(column, value):
    if not value:
        return sa.false()
    return column.in_(value)


def _op_not_in(column, value):
    if not value:
        return sa.true()
    return sa.not_(column.in_(value))


def _op_has(column, _value):
    return column.is_not(None)


def _op_not_has(column, _value):
    return column.is_(None)


_CONDITION_BUILDERS: Dict[str, Callable[[sa.sql.ColumnElement[Any], Any], ClauseElement]] = {
    "==": _op_eq,
    "!=": _op_ne,
    ">": _op_gt,
    ">=": _op_ge,
    "<": _op_lt,
    "<=": _op_le,
    "in": _op_in,
    "!in": _op_not_in,
    "has": _op_has,
    "!has": _op_not_has,
}


def _parse_get_operand(operand: Any) -> str:
    if not isinstance(operand, list) or len(operand) != 2 or operand[0] != "get":
        raise FilterExpressionError()

    field_name = operand[1]
    if not isinstance(field_name, str):
        raise FilterExpressionError()
    return field_name


class FilterParser:
    def __init__(self, fields: Iterable[FieldInfo]):
        self._fields = {field.key: field for field in fields}

    @classmethod
    def from_resource(cls, resource) -> "FilterParser":
        fields = [FieldInfo(key=f.keyname, datatype=f.datatype) for f in resource.fields]
        fields.append(FieldInfo(key="id", datatype=FIELD_TYPE.INTEGER))
        return cls(fields)

    def parse(self, expression: Any) -> FilterProgram:
        if expression is None:
            return FilterProgram(None)

        if isinstance(expression, str):
            try:
                expression = json.loads(expression)
            except ValueError as exc:
                raise FilterExpressionError() from exc

        node = self._parse_node(expression)
        return FilterProgram(node)

    def _parse_node(self, expression: Any) -> FilterNode | None:
        if expression == []:
            return None

        if not isinstance(expression, list) or len(expression) == 0:
            raise FilterExpressionError()

        operator = expression[0]
        if not isinstance(operator, str):
            raise FilterExpressionError()

        if operator in {"all", "any"}:
            children = [self._parse_node(arg) for arg in expression[1:]]
            return LogicalNode(operator, children)

        return self._parse_condition(operator, expression[1:])

    def _parse_condition(self, operator: str, operands: Sequence[Any]) -> ConditionNode:
        if operator not in _CONDITION_BUILDERS:
            raise FilterExpressionError()

        expected_len = 1 if operator in {"has", "!has"} else 2
        if len(operands) != expected_len:
            raise FilterExpressionError()

        field_name = _parse_get_operand(operands[0])

        try:
            field = self._fields[field_name]
        except KeyError as exc:
            raise FilterExpressionError(data={"field": field_name}) from exc

        value = None
        if operator not in {"has", "!has"}:
            value = _convert_value(field, operator, operands[1])

        return ConditionNode(operator, field, value)


__all__ = [
    "FilterExpressionError",
    "FilterParser",
    "FilterProgram",
]
