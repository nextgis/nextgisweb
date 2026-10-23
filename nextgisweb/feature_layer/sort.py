from __future__ import annotations

import json
from typing import Any

from nextgisweb.env import gettext

from nextgisweb.core.exception import ValidationError

from .filter import FidNode, FieldNode, FilterExpressionError, FilterParser
from .interface import FID_KEY

_SORT_DIRECTIONS = ("asc", "desc")


class SortExpressionError(ValidationError):
    def __init__(self, *, data: dict[str, Any] | None = None):
        super().__init__(message=gettext("Invalid sort expression"), data=data)


def parse_sort(resource, raw: str) -> list[tuple[str, str | None]]:
    try:
        expression = json.loads(raw)
    except ValueError as exc:
        raise SortExpressionError() from exc

    if expression == []:
        return []

    if not isinstance(expression, list):
        raise SortExpressionError(data={"reason": "Sort expression must be a list"})

    parser = FilterParser.from_resource(resource)

    result: list[tuple[str, str | None]] = []
    for item in expression:
        if not isinstance(item, list) or len(item) != 2 or item[0] not in _SORT_DIRECTIONS:
            raise SortExpressionError(
                data={
                    "reason": "Each sort item must be [direction, expression] "
                    "with direction 'asc' or 'desc'"
                }
            )
        direction, operand = item

        try:
            node = parser.parse_operand(operand)
        except FilterExpressionError as exc:
            raise SortExpressionError(data=exc.data) from exc

        if isinstance(node, FidNode):
            key = FID_KEY
        elif isinstance(node, FieldNode):
            key = node.field.key
        else:
            raise SortExpressionError(
                data={"reason": "Sort expression must be ['get', field] or ['fid']"}
            )

        result.append((direction, key))

    return result


__all__ = [
    "SortExpressionError",
    "parse_sort",
]
