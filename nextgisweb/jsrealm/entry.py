from typing import ClassVar, Set

from msgspec import Struct
from typing_extensions import Self

from nextgisweb.env.package import pkginfo
from nextgisweb.lib.imptool import module_from_stack


class JSEntry(Struct, frozen=True):
    registry: ClassVar[Set[Self]] = set()

    component: str
    module: str


def jsentry(module: str, *, depth: int = 0) -> str:
    original = module

    if not module.startswith("@"):
        py_module = module_from_stack(depth, (__name__))
        component = pkginfo.component_by_module(py_module)
        module = "/".join(("@nextgisweb", component.replace("_", "-"), module))
    else:
        assert module.startswith("@nextgisweb/")
        component = module.split("/")[1].replace("-", "_")

    JSEntry.registry.add(JSEntry(component, module))
    return original
