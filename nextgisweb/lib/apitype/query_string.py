from functools import cached_property
from itertools import groupby
from typing import Any, Callable, Mapping, Optional, Sequence, Tuple

from msgspec import NODEFAULT, ValidationError

from .primitive import SequenceDecoder, StringDecoder, unquote_strict


class QueryString:
    def __init__(self, value: str) -> None:
        self.value = value

    @cached_property
    def params(self) -> Sequence[Tuple[str, str]]:
        return [
            (unquote_strict(nv[0]), nv[1])
            for nv in [p.split("=", maxsplit=1) for p in self.value.split("&")]
            if len(nv) == 2
        ]

    @cached_property
    def grouped(self) -> Mapping[str, Sequence[str]]:
        key = lambda nv: nv[0]
        return {
            k: [nv[1] for nv in g]
            for k, g in groupby(
                sorted(self.params, key=key),
                key=key,
            )
        }

    def last(self, name: str) -> Optional[str]:
        return None if (v := self.grouped.get(name)) is None else v[-1]


QueryStringDecoder = Callable[[QueryString], Any]


def primitive(qs: QueryString, *, name: str, default: Any, loads: StringDecoder) -> Any:
    value = qs.last(name)
    if value is None:
        if default is NODEFAULT:
            raise QueryParamRequired(name)
        return default
    try:
        return loads(unquote_strict(value))
    except ValidationError as exc:
        raise QueryParamInvalidValue(name) from exc


def form_list(qs: QueryString, *, name: str, default: Any, loads: SequenceDecoder) -> Any:
    value = qs.last(name)
    if value is None:
        if default is NODEFAULT:
            raise QueryParamRequired(name)
        return default

    try:
        return loads(value)
    except ValidationError as exc:
        raise QueryParamInvalidValue(name) from exc


def form_object(qs: QueryString, *, cls, fields) -> Any:
    values = {k: v(qs) for k, v in fields}
    return cls(**values)


def deep_dict(qs: QueryString, *, name: str, loadk: StringDecoder, loadv: StringDecoder) -> dict:
    name_len = len(name)
    try:
        return {
            loadk(unquote_strict(pn[name_len + 1 : -1])): loadv(unquote_strict(pvs[-1]))
            for pn, pvs in qs.grouped.items()
            if len(pn) > name_len and pn[name_len] == "[" and pn[-1] == "]"
        }
    except ValidationError as exc:
        raise QueryParamInvalidValue(name) from exc


class QueryParamError(ValueError):
    name: str

    def __init__(self, msg: str, *, name: str):
        self.name = name
        super().__init__(msg)


class QueryParamRequired(QueryParamError):
    def __init__(self, name: str):
        super().__init__(f"Query parameter required: {name}", name=name)


class QueryParamInvalidValue(QueryParamError):
    def __init__(self, name: str):
        super().__init__(f"Invalid query parameter value: {name}", name=name)
