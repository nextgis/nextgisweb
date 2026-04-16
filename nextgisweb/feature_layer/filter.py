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
    def __init__(self, root: FilterNode | None):
        self._root = root

    def to_clause(
        self,
        columns: Mapping[str, sa.sql.ColumnElement[Any]],
        virtual_operands: Mapping[str, sa.sql.ColumnElement[Any]] | None = None,
    ) -> sa.sql.ColumnElement[Any] | None:
        return SQLAlchemyCompiler(columns, virtual_operands or {}).compile(self._root)


class FilterNode:
    registry: dict[str, type[FilterNode]] = {}

    def __init_subclass__(cls, operators: Iterable[str] = (), **kwargs):
        super().__init_subclass__(**kwargs)
        for op in operators:
            cls.registry[op] = cls

    @classmethod
    def from_json(
        cls, operator: str, operands: Sequence[Any], parser: "FilterParser"
    ) -> FilterNode:
        raise NotImplementedError  # pragma: no cover

    @property
    def datatype(self) -> str | None:
        return None


class LiteralNode(FilterNode):
    def __init__(self, value: Any):
        self.value = value


class FieldNode(FilterNode, operators=("get",)):
    def __init__(self, field: FieldInfo):
        self.field = field

    @classmethod
    def from_json(cls, operator: str, operands: Sequence[Any], parser: FilterParser) -> FieldNode:
        if len(operands) != 1 or not isinstance(operands[0], str):
            raise FilterExpressionError()
        field_name = operands[0]
        try:
            field = parser._fields[field_name]
        except KeyError as exc:
            raise FilterExpressionError(
                data={"reason": f"Field '{field_name}' not found"}
            ) from exc
        return cls(field)

    @property
    def datatype(self) -> str | None:
        return self.field.datatype


class FidNode(FilterNode, operators=("fid",)):
    @classmethod
    def from_json(cls, operator: str, operands: Sequence[Any], parser: FilterParser) -> FidNode:
        if len(operands) != 0:
            raise FilterExpressionError(data={"reason": f"Operator {operator} takes no operands"})
        return cls()

    @property
    def datatype(self) -> str | None:
        return FIELD_TYPE.INTEGER


class LogicalNode(FilterNode):
    def __init__(self, children: Sequence[FilterNode]):
        self.children = tuple(children)

    @classmethod
    def from_json(
        cls, operator: str, operands: Sequence[Any], parser: FilterParser
    ) -> LogicalNode:
        return cls([parser.parse_operand(arg) for arg in operands])


class AndNode(LogicalNode, operators=("all",)):
    pass


class OrNode(LogicalNode, operators=("any",)):
    pass


class ConditionNode(FilterNode):
    num_operands: int
    is_list: bool = False


class UnaryConditionNode(ConditionNode):
    num_operands = 1

    def __init__(self, operand: FilterNode):
        self.operand = operand

    @classmethod
    def from_json(
        cls, operator: str, operands: Sequence[Any], parser: FilterParser
    ) -> UnaryConditionNode:
        if len(operands) != cls.num_operands:
            raise FilterExpressionError(
                data={"reason": f"Invalid number of operands for condition {operator}"}
            )

        operand = parser.parse_operand(operands[0])
        return cls(operand)


class BinaryConditionNode(ConditionNode):
    num_operands = 2

    def __init__(self, left: FilterNode, right: FilterNode):
        self.left = left
        self.right = right

    @classmethod
    def from_json(
        cls, operator: str, operands: Sequence[Any], parser: FilterParser
    ) -> BinaryConditionNode:
        if cls.is_list:
            if len(operands) > cls.num_operands:
                operands = [operands[0], list(operands[1:])]
            elif len(operands) == cls.num_operands:
                val = operands[1]
                if isinstance(val, list):
                    raise FilterExpressionError(
                        data={
                            "reason": f"Operator {operator} requires flat values, nested lists are not allowed"
                        }
                    )
                operands = [operands[0], [val]]

        if len(operands) != cls.num_operands:
            if cls.is_list and len(operands) < cls.num_operands:
                raise FilterExpressionError(
                    data={"reason": f"Operator {operator} requires at least one value argument"}
                )

            raise FilterExpressionError(
                data={"reason": f"Invalid number of operands for condition {operator}"}
            )

        left = parser.parse_operand(operands[0])

        if cls.is_list:
            right = LiteralNode(operands[1])
        else:
            right = parser.parse_operand(operands[1])

        if isinstance(left, LiteralNode) and right.datatype is not None:
            left.value = _convert_value(right.datatype, left.value, is_list=False)
        elif isinstance(right, LiteralNode) and left.datatype is not None:
            right.value = _convert_value(left.datatype, right.value, is_list=cls.is_list)

        return cls(left, right)


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


class IsNullNode(UnaryConditionNode, operators=("is_null",)):
    pass


class NotIsNullNode(UnaryConditionNode, operators=("!is_null",)):
    pass


class IlikeNode(BinaryConditionNode, operators=("ilike",)):
    pass


class NotIlikeNode(BinaryConditionNode, operators=("!ilike",)):
    pass


class SQLAlchemyCompiler:
    def __init__(
        self,
        columns: Mapping[str, sa.sql.ColumnElement[Any]],
        virtual_operands: Mapping[str, sa.sql.ColumnElement[Any]],
    ):
        self.columns = columns
        self.virtual_operands = virtual_operands

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

            case EqualNode(left=left, right=right):
                return self._compile_equality(left, right, negate=False)

            case NotEqualNode(left=left, right=right):
                return self._compile_equality(left, right, negate=True)

            case GreaterNode(left=left, right=right):
                return self._compile_operand(left) > self._compile_operand(right)

            case GreaterEqualNode(left=left, right=right):
                return self._compile_operand(left) >= self._compile_operand(right)

            case LessNode(left=left, right=right):
                return self._compile_operand(left) < self._compile_operand(right)

            case LessEqualNode(left=left, right=right):
                return self._compile_operand(left) <= self._compile_operand(right)

            case InNode(left=left, right=right):
                return self._compile_in(left, right, negate=False)

            case NotInNode(left=left, right=right):
                return self._compile_in(left, right, negate=True)

            case IsNullNode(operand=operand):
                return self._compile_operand(operand).is_(None)

            case NotIsNullNode(operand=operand):
                return self._compile_operand(operand).is_not(None)

            case IlikeNode(left=left, right=right):
                return self._compile_operand(left).ilike(self._compile_operand(right))

            case NotIlikeNode(left=left, right=right):
                return sa.not_(self._compile_operand(left).ilike(self._compile_operand(right)))

            case FieldNode(field=field):
                return self._get_column(field)

            case FidNode():
                return self._get_virtual_operand("fid")

            case LiteralNode(value=value):
                return sa.literal(value)

            case _:
                raise NotImplementedError(f"Unknown node type: {type(node)}")

    def _compile_operand(self, node: FilterNode) -> sa.sql.ColumnElement[Any]:
        expr = self.compile(node)
        if expr is None:
            raise FilterExpressionError(data={"reason": "Operand evaluated to empty expression"})
        return expr

    def _get_column(self, field: FieldInfo) -> sa.sql.ColumnElement[Any]:
        try:
            return self.columns[field.key]
        except KeyError as exc:
            raise FilterExpressionError() from exc

    def _get_virtual_operand(self, key: str) -> sa.sql.ColumnElement[Any]:
        try:
            return self.virtual_operands[key]
        except KeyError as exc:
            raise FilterExpressionError() from exc

    def _compile_equality(
        self, left: FilterNode, right: FilterNode, *, negate: bool
    ) -> sa.sql.ColumnElement[Any]:
        if isinstance(right, LiteralNode) and right.value is None:
            col = self._compile_operand(left)
            return col.is_not(None) if negate else col.is_(None)
        if isinstance(left, LiteralNode) and left.value is None:
            col = self._compile_operand(right)
            return col.is_not(None) if negate else col.is_(None)

        left_expr = self._compile_operand(left)
        right_expr = self._compile_operand(right)
        return left_expr != right_expr if negate else left_expr == right_expr

    def _compile_in(
        self, left: FilterNode, right: FilterNode, *, negate: bool
    ) -> sa.sql.ColumnElement[Any]:
        left_expr = self._compile_operand(left)

        if not isinstance(right, LiteralNode) or not isinstance(right.value, (list, tuple, set)):
            raise FilterExpressionError(
                data={"reason": "Right operand of 'in' operator must be a literal list"}
            )

        expr = left_expr.in_(right.value)
        return sa.not_(expr) if negate else expr


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


def _convert_scalar(datatype: str, value: Any) -> Any:
    if value is None:
        return None

    try:
        converter = _SCALAR_CONVERTERS[datatype]
        return converter(value)
    except KeyError:
        raise FilterExpressionError()
    except (TypeError, ValueError) as exc:
        raise FilterExpressionError() from exc


def _convert_value(datatype: str, value: Any, *, is_list: bool = False) -> Any:
    if is_list:
        values = _ensure_list(value)
        return [_convert_scalar(datatype, item) for item in values]

    return _convert_scalar(datatype, value)


class FilterParser:
    def __init__(self, fields: Iterable[FieldInfo]):
        self._fields = {field.key: field for field in fields}

    @classmethod
    def from_resource(cls, resource) -> FilterParser:
        fields = [FieldInfo(key=f.keyname, datatype=f.datatype) for f in resource.fields]
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

        if not isinstance(expression, list):
            raise FilterExpressionError(data={"reason": "Filter root expression must be a list"})

        node = self.parse_operand(expression)
        return FilterProgram(node)

    def parse_operand(self, expression: Any) -> FilterNode:
        if isinstance(expression, list):
            if not expression:
                raise FilterExpressionError(data={"reason": "Expression must be a non-empty list"})
            operator = expression[0]
            if isinstance(operator, str) and operator in FilterNode.registry:
                return self._parse_node(expression)
            raise FilterExpressionError()
        return LiteralNode(expression)

    def _parse_node(self, expression: list[Any]) -> FilterNode:
        operator = expression[0]
        node_cls = FilterNode.registry[operator]
        return node_cls.from_json(operator, expression[1:], self)

    @classmethod
    def get_supported_operators(cls) -> list[str]:
        return list(FilterNode.registry.keys())


__all__ = [
    FilterExpressionError,
    FilterParser,
    FilterProgram,
]
