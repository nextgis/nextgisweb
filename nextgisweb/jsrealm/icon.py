from typing import ClassVar, Union

from msgspec import Struct
from typing_extensions import Self

from nextgisweb.env.package import pkginfo
from nextgisweb.lib.imptool import module_from_stack


class Icon(Struct, frozen=True):
    registry: ClassVar[set[Self]] = set()

    collection: str
    glyph: str
    variant: Union[str, None]


def icon(name: str, *, variant: Union[str, None] = None, depth: int = 0) -> str:
    parts = name.split("/", maxsplit=1)
    if len(parts) == 1:
        py_module = module_from_stack(depth, (__name__))
        collection = pkginfo.component_by_module(py_module)
        glyph = name
    else:
        collection, glyph = parts

    assert collection is not None
    assert glyph is not None

    Icon.registry.add(Icon(collection, glyph, variant))
    return f"{collection}-{glyph}" + (f"-{variant}" if variant else "")
