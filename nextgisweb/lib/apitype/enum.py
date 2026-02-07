from typing import Callable, TypeVar

from msgspec import Meta

from .util import annotate

T = TypeVar("T", bound=str)

_enum_registry = dict[type, set[str]]()


def declare_enum(tdef: type[T]) -> tuple[type[T], Callable[[str], T]]:
    values = _enum_registry[tdef] = set()
    tdef = annotate(tdef, [Meta(extra_json_schema=dict(enum=values))])

    def maker(value: str) -> T:
        values.add(value)
        return tdef(value)

    return tdef, maker
