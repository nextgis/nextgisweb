from __future__ import annotations

import json
from collections.abc import Mapping, Sequence
from dataclasses import dataclass
from datetime import date, datetime, time
from typing import Any, Callable, Iterable

import sqlalchemy as sa

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
    def __init__(self, *, data: dict[str, Any] | None = None):
        super().__init__(message=gettext("Invalid filter expression"), data=data)


@dataclass(frozen=True)
class FieldInfo:
    key: str
    datatype: str


class FilterProgram:
    def __init__(self, root: "FilterNode | None"):
        self._root = root

    def to_clause(
        self, columns: Mapping[str, sa.sql.ColumnElement[Any]]
    ) -> sa.sql.ColumnElement[Any] | None:
        return SQLAlchemyCompiler(columns).compile(self._root)


class FilterNode:
    registry: dict[str, type[FilterNode]] = {}

    def __init_subclass__(cls, operators: Iterable[str] = (), **kwargs):
        super().__init_subclass__(**kwargs)
        for op in operators:
            cls.registry[op] = cls

    @classmethod
    def from_json(
        cls, operator: str, operands: Sequence[Any], parser: "FilterParser"
    ) -> FilterNode | None:
        raise NotImplementedError


class LogicalNode(FilterNode):
    def __init__(self, children: Sequence[FilterNode | None]):
        self.children = tuple(child for child in children if child is not None)

    @classmethod
    def from_json(
        cls, operator: str, operands: Sequence[Any], parser: "FilterParser"
    ) -> LogicalNode:
        return cls([parser._parse_node(arg) for arg in operands])


class AndNode(LogicalNode, operators=("all",)):
    pass


class OrNode(LogicalNode, operators=("any",)):
    pass


class ConditionNode(FilterNode):
    num_operands: int
    is_list: bool = False

    def __init__(self, field: FieldInfo, value: Any):
        self.field = field
        self.value = value

    @classmethod
    def from_json(
        cls, operator: str, operands: Sequence[Any], parser: "FilterParser"
    ) -> ConditionNode:
        if len(operands) != cls.num_operands:
            raise FilterExpressionError(
                data={"reason": f"Invalid number of operands for condition {operator}"}
            )

        field_name = _parse_get_operand(operands[0])

        try:
            field = parser._fields[field_name]
        except KeyError as exc:
            raise FilterExpressionError(
                data={"reason": f"Field '{field_name}' not found"}
            ) from exc

        value = None
        if cls.num_operands > 1:
            value = _convert_value(field, operands[1], is_list=cls.is_list)

        return cls(field, value)


class BinaryConditionNode(ConditionNode):
    num_operands = 2


class EqualNode(BinaryConditionNode, operators=("==",)):
    pass


class NotEqualNode(BinaryConditionNode, operators=("!=",)):
    pass


class GreaterNode(BinaryConditionNode, operators=(">",)):
    pass


class GreaterEqualNode(BinaryConditionNode, operators=(">=",)):
    pass


class LessNode(BinaryConditionNode, operators=("<",)):
    pass


class LessEqualNode(BinaryConditionNode, operators=("<=",)):
    pass


class InNode(BinaryConditionNode, operators=("in",)):
    is_list = True


class NotInNode(BinaryConditionNode, operators=("!in",)):
    is_list = True


class HasNode(ConditionNode, operators=("has",)):
    num_operands = 1


class NotHasNode(ConditionNode, operators=("!has",)):
    num_operands = 1


class SQLAlchemyCompiler:
    def __init__(self, columns: Mapping[str, sa.sql.ColumnElement[Any]]):
        self.columns = columns

    def compile(self, node: FilterNode | None) -> sa.sql.ColumnElement[Any] | None:
        match node:
            case None:
                return None

            case AndNode(children=children):
                exprs = [e for child in children if (e := self.compile(child)) is not None]
                return sa.and_(*exprs) if exprs else None

            case OrNode(children=children):
                exprs = [e for child in children if (e := self.compile(child)) is not None]
                return sa.or_(*exprs) if exprs else None

            case EqualNode(field=field, value=value):
                col = self._get_column(field)
                return col == value if value is not None else col.is_(None)

            case NotEqualNode(field=field, value=value):
                col = self._get_column(field)
                return col != value if value is not None else col.is_not(None)

            case GreaterNode(field=field, value=value):
                return self._get_column(field) > value

            case GreaterEqualNode(field=field, value=value):
                return self._get_column(field) >= value

            case LessNode(field=field, value=value):
                return self._get_column(field) < value

            case LessEqualNode(field=field, value=value):
                return self._get_column(field) <= value

            case InNode(field=field, value=value):
                col = self._get_column(field)
                return col.in_(value) if value else sa.false()

            case NotInNode(field=field, value=value):
                col = self._get_column(field)
                return sa.not_(col.in_(value)) if value else sa.true()

            case HasNode(field=field):
                return self._get_column(field).is_not(None)

            case NotHasNode(field=field):
                return self._get_column(field).is_(None)

            case _:
                raise NotImplementedError(f"Unknown node type: {type(node)}")

    def _get_column(self, field: FieldInfo) -> sa.sql.ColumnElement[Any]:
        try:
            return self.columns[field.key]
        except KeyError as exc:
            raise FilterExpressionError() from exc


def _ensure_list(value: Any) -> list[Any]:
    if isinstance(value, list):
        return value
    raise FilterExpressionError()


def _conv_int(value: Any) -> int:
    if isinstance(value, bool):
        raise ValueError
    return int(value)


def _conv_float(value: Any) -> float:
    if isinstance(value, bool):
        raise ValueError
    return float(value)


def _conv_str(value: Any) -> str:
    if isinstance(value, (str, int, float, bool)):
        return str(value)
    raise ValueError


def _conv_date(value: Any) -> date:
    if isinstance(value, date) and not isinstance(value, datetime):
        return value
    if isinstance(value, str):
        return date.fromisoformat(value)
    raise ValueError


def _conv_time(value: Any) -> time:
    if isinstance(value, time) and not isinstance(value, datetime):
        return value
    if isinstance(value, str):
        return time.fromisoformat(value)
    raise ValueError


def _conv_datetime(value: Any) -> datetime:
    if isinstance(value, datetime):
        return value
    if isinstance(value, str):
        return datetime.fromisoformat(value)
    raise ValueError


_SCALAR_CONVERTERS: dict[str, Callable[[Any], Any]] = {
    FIELD_TYPE.INTEGER: _conv_int,
    FIELD_TYPE.BIGINT: _conv_int,
    FIELD_TYPE.REAL: _conv_float,
    FIELD_TYPE.STRING: _conv_str,
    FIELD_TYPE.DATE: _conv_date,
    FIELD_TYPE.TIME: _conv_time,
    FIELD_TYPE.DATETIME: _conv_datetime,
}


def _convert_scalar(field: FieldInfo, value: Any) -> Any:
    if value is None:
        return None

    try:
        converter = _SCALAR_CONVERTERS[field.datatype]
        return converter(value)
    except KeyError:
        raise FilterExpressionError()
    except (TypeError, ValueError) as exc:
        raise FilterExpressionError() from exc


def _convert_value(field: FieldInfo, value: Any, *, is_list: bool = False) -> Any:
    if is_list:
        values = _ensure_list(value)
        return [_convert_scalar(field, item) for item in values]

    return _convert_scalar(field, value)


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

        if expression == []:
            return FilterProgram(None)

        node = self._parse_node(expression)
        return FilterProgram(node)

    def _parse_node(self, expression: Any) -> FilterNode | None:
        if not isinstance(expression, list) or len(expression) == 0:
            raise FilterExpressionError(data={"reason": "Expression must be a non-empty list"})

        operator = expression[0]
        if not isinstance(operator, str):
            raise FilterExpressionError()

        node_cls = FilterNode.registry.get(operator)
        if node_cls is None:
            raise FilterExpressionError()

        return node_cls.from_json(operator, expression[1:], self)

    @classmethod
    def get_supported_operators(cls) -> list[str]:
        return list(FilterNode.registry.keys())


__all__ = [
    "FilterExpressionError",
    "FilterParser",
    "FilterProgram",
]
