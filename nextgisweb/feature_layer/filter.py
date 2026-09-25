from __future__ import annotations

import json
from collections.abc import Callable, Iterable, Mapping, Sequence
from dataclasses import dataclass
from datetime import date, datetime, time
from typing import Any

import msgspec
import sqlalchemy as sa
from msgspec import Struct, convert

from nextgisweb.env import gettext

from nextgisweb.core.exception import ValidationError
from nextgisweb.resource import ResourceScope

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


def legacy_to_expression(resource, filter_) -> list[Any]:
    """Translate legacy (key, operator, value) filter tuples into an expression.

    The tuples mirror the legacy ``fld_*`` / ``id__*`` query-parameter semantics;
    an ``"id"`` key translates to the virtual ``fid`` operand.

    Returns a flat list of condition expressions (possibly empty).
    """
    conditions: list[Any] = []
    for key, operator, value in filter_:
        if operator == "startswith":
            raise ValidationError(
                message="The 'startswith' operator is not supported in the new filter format."
            )

        if key == "id":
            left = ["fid"]
        else:
            try:
                resource.field_by_keyname(key)
            except KeyError:
                raise ValidationError(message="Unknown field '%s'." % key)
            left = ["get", key]

        if operator == "eq":
            cond = ["==", left, value]
        elif operator == "ne":
            cond = ["!=", left, value]
        elif operator == "gt":
            cond = [">", left, value]
        elif operator == "ge":
            cond = [">=", left, value]
        elif operator == "lt":
            cond = ["<", left, value]
        elif operator == "le":
            cond = ["<=", left, value]
        elif operator == "in":
            vals = value.split(",") if value else []
            cond = ["in", left, *vals]
        elif operator == "notin":
            vals = value.split(",") if value else []
            cond = ["!in", left, *vals]
        elif operator == "isnull":
            if value == "yes":
                cond = ["is_null", left]
            elif value == "no":
                cond = ["!is_null", left]
            else:
                raise ValidationError(
                    message="Invalid value '%s' for operator '%s'." % (value, operator)
                )
        elif operator == "like":
            cond = ["like", left, value]
        elif operator == "ilike":
            cond = ["ilike", left, value]
        else:
            raise ValidationError(message="Invalid operator '%s'." % operator)

        conditions.append(cond)

    return conditions


@dataclass(frozen=True)
class FieldInfo:
    key: str
    datatype: str
    id: int | None = None
    text_search: bool = True
    lookup_table_id: int | None = None


class TextSearchOptions(Struct):
    case_sensitive: bool = False


class TextSearchSpec:
    __slots__ = ("value", "case_sensitive", "keys_by_field")

    def __init__(
        self,
        value: str,
        case_sensitive: bool,
        keys_by_field: Mapping[str, Sequence[str]] | None = None,
    ):
        self.value = value
        self.case_sensitive = case_sensitive
        self.keys_by_field = keys_by_field or {}

    def __repr__(self):
        return f"TextSearchSpec(value={self.value!r}, case_sensitive={self.case_sensitive}, keys_by_field={self.keys_by_field!r})"


class FilterProgram:
    def __init__(
        self,
        root: FilterNode | None,
        *,
        search_keys: Sequence[str] = (),
        text_search: TextSearchSpec | None = None,
    ):
        self._root = root
        self._search_keys = search_keys
        self._text_search = text_search

    def to_clause(
        self,
        columns: Mapping[str, sa.sql.ColumnElement[Any]],
        virtual_operands: Mapping[str, sa.sql.ColumnElement[Any]] | None = None,
    ) -> sa.sql.ColumnElement[Any] | None:
        return SQLAlchemyCompiler(
            columns,
            virtual_operands or {},
            search_keys=self._search_keys,
        ).compile(self._root)

    @property
    def text_search_spec(self) -> TextSearchSpec | None:
        return self._text_search


class FilterNode:
    registry: dict[str, type[FilterNode]] = {}

    def __init_subclass__(cls, operators: Iterable[str] = (), **kwargs):
        super().__init_subclass__(**kwargs)
        for op in operators:
            cls.registry[op] = cls

    @classmethod
    def from_json(cls, operator: str, operands: Sequence[Any], parser: FilterParser) -> FilterNode:
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


class LikeNode(BinaryConditionNode, operators=("like",)):
    pass


class IlikeNode(BinaryConditionNode, operators=("ilike",)):
    pass


class NotIlikeNode(BinaryConditionNode, operators=("!ilike",)):
    pass


class TextSearchNode(FilterNode, operators=("text_search",)):
    def __init__(
        self, value: str, case_sensitive: bool, keys_by_field: Mapping[str, Sequence[str]]
    ):
        self.value = value
        self.case_sensitive = case_sensitive
        self.keys_by_field = keys_by_field

    @classmethod
    def from_json(
        cls, operator: str, operands: Sequence[Any], parser: FilterParser
    ) -> TextSearchNode:
        if not 1 <= len(operands) <= 2:
            raise FilterExpressionError(
                data={"reason": f"Invalid number of operands for condition {operator}"}
            )

        value = operands[0]
        if not isinstance(value, str) or not value:
            raise FilterExpressionError(
                data={"reason": "The 'text_search' query must be a non-empty string"}
            )

        options = TextSearchOptions()
        if len(operands) == 2:
            operand = operands[1]
            if not isinstance(operand, dict):
                raise FilterExpressionError(
                    data={"reason": "The 'text_search' options must be an object"}
                )
            try:
                options = convert(operand, TextSearchOptions)
            except msgspec.ValidationError:
                raise FilterExpressionError(
                    data={"reason": "Invalid 'text_search' options"}
                ) from None

        return cls(
            value, options.case_sensitive, parser._text_search_keys(value, options.case_sensitive)
        )


class SQLAlchemyCompiler:
    def __init__(
        self,
        columns: Mapping[str, sa.sql.ColumnElement[Any]],
        virtual_operands: Mapping[str, sa.sql.ColumnElement[Any]],
        *,
        search_keys: Sequence[str] = (),
    ):
        self.columns = columns
        self.virtual_operands = virtual_operands
        self._search_keys = search_keys

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

            case LikeNode(left=left, right=right):
                return self._compile_operand(left).like(self._compile_operand(right))

            case IlikeNode(left=left, right=right):
                return self._compile_operand(left).ilike(self._compile_operand(right))

            case NotIlikeNode(left=left, right=right):
                return sa.not_(self._compile_operand(left).ilike(self._compile_operand(right)))

            case TextSearchNode(
                value=value, case_sensitive=case_sensitive, keys_by_field=keys_by_field
            ):
                if not self._search_keys:
                    return sa.false()
                predicates: list[sa.sql.ColumnElement[Any]] = [
                    text_search_match_clause(
                        self.columns[key],
                        value=value,
                        case_sensitive=case_sensitive,
                        keys_by_field=keys_by_field.get(key),
                    )
                    for key in self._search_keys
                    if key in self.columns
                ]
                return sa.or_(*predicates) if predicates else sa.false()

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


def text_search_match_clause(
    column: sa.sql.ColumnElement[Any],
    value: str,
    *,
    case_sensitive: bool,
    keys_by_field: Sequence[str] | None = None,
) -> sa.sql.ColumnElement[Any]:
    """Build a text search predicate for a single column.

    The column value is matched against ``value`` with a substring match
    (case-insensitive by default) and, when lookup-table keys are given for
    the field, by exact key equality via ``IN``.
    """

    text_col = sa.cast(column, sa.Text)
    match = text_col.like(f"%{value}%") if case_sensitive else text_col.ilike(f"%{value}%")
    if keys_by_field:
        return sa.or_(column.in_(list(keys_by_field)), match)
    return match


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


def _conv_bool(value: Any) -> bool:
    if isinstance(value, bool):
        return value
    if isinstance(value, int):
        return bool(value)
    if isinstance(value, str):
        if value.lower() in ("true", "1"):
            return True
        if value.lower() in ("false", "0"):
            return False
    raise ValueError


_SCALAR_CONVERTERS: dict[str, Callable[[Any], Any]] = {
    FIELD_TYPE.INTEGER: _conv_int,
    FIELD_TYPE.BIGINT: _conv_int,
    FIELD_TYPE.REAL: _conv_float,
    FIELD_TYPE.STRING: _conv_str,
    FIELD_TYPE.DATE: _conv_date,
    FIELD_TYPE.TIME: _conv_time,
    FIELD_TYPE.DATETIME: _conv_datetime,
    FIELD_TYPE.BOOLEAN: _conv_bool,
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
    def __init__(self, fields: Iterable[FieldInfo], *, user: Any = None):
        self._fields = {field.key: field for field in fields}
        self._search_keys = [f.key for f in self._fields.values() if f.text_search]
        self._lookup_fields = [
            f.key for f in self._fields.values() if f.text_search and f.lookup_table_id is not None
        ]
        self._lookup_ids = {
            f.key: f.lookup_table_id
            for f in self._fields.values()
            if f.lookup_table_id is not None
        }
        self._user = user

    @classmethod
    def from_resource(cls, resource, *, user: Any = None) -> FilterParser:
        fields = [
            FieldInfo(
                key=f.keyname,
                datatype=f.datatype,
                id=f.id,
                text_search=f.text_search,
                lookup_table_id=f.lookup_table_id,
            )
            for f in resource.fields
        ]
        return cls(fields, user=user)

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
        text_search = self._get_text_search(node)
        return FilterProgram(node, search_keys=self._search_keys, text_search=text_search)

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

    def _get_text_search(self, node: FilterNode | None) -> TextSearchSpec | None:
        if isinstance(node, TextSearchNode):
            return TextSearchSpec(node.value, node.case_sensitive, node.keys_by_field)
        if isinstance(node, LogicalNode):
            for child in node.children:
                if (spec := self._get_text_search(child)) is not None:
                    return spec
        return None

    def _text_search_keys(self, value: str, case_sensitive: bool) -> dict[str, list[str]]:
        """Resolve lookup-table keys whose labels match ``value``.

        Only fields the ``user`` can read are considered; otherwise the
        field is searched by the raw value only.
        """

        if self._user is None or not self._lookup_fields:
            return {}

        from nextgisweb.lookup_table import LookupTable

        result: dict[str, list[str]] = {}
        for key in self._lookup_fields:
            lookup = LookupTable.filter_by(id=self._lookup_ids[key]).first()
            if lookup is None or not lookup.has_permission(ResourceScope.read, self._user):
                continue

            if case_sensitive:
                keys = [k for k, v in lookup.value if value in v]
            else:
                q = value.lower()
                keys = [k for k, v in lookup.value if q in v.lower()]

            if keys:
                result[key] = keys
        return result


__all__ = [
    FilterExpressionError,
    FilterParser,
    FilterProgram,
]
