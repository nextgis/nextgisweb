from collections.abc import Callable

from msgspec import Meta

from .util import annotate

_enum_registry = dict[type, set[str]]()


def declare_enum[T: str](tdef: type[T]) -> tuple[type[T], Callable[[str], T]]:
    values = _enum_registry[tdef] = set()
    tdef = annotate(tdef, [Meta(extra_json_schema=dict(enum=values))])

    def maker(value: str) -> T:
        values.add(value)
        return tdef(value)

    return tdef, maker
