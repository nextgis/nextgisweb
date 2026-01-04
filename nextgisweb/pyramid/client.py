from __future__ import annotations

from collections import defaultdict
from inspect import signature
from typing import Any, Protocol, TypeVar

from msgspec import Struct, defstruct

from nextgisweb.env import Component
from nextgisweb.env.package import pkginfo
from nextgisweb.lib.imptool import module_from_stack

TComp = TypeVar("TComp", bound=Component, contravariant=True)
TStruct = TypeVar("TStruct", bound=Struct)


class _CSCallable(Protocol[TComp]):
    def __call__(self, comp: TComp, request) -> Any: ...


registry = defaultdict[str, dict[str, _CSCallable]](dict)


def client_setting(name: str, *, stacklevel: int = 0):
    module = module_from_stack(stacklevel)
    comp_id = pkginfo.component_by_module(module)
    assert comp_id is not None

    def decorator(func: _CSCallable):
        registry[comp_id][name] = func
        return func

    return decorator


def struct_type(comp: Component) -> type[Struct] | None:
    fields = list[tuple[str, Any]]()
    for name, func in registry[comp.identity].items():
        func_sig = signature(func, eval_str=True)
        comp_annotation = func_sig.parameters["comp"].annotation
        assert issubclass(comp_annotation, type(comp)), f"{func} invalid 'comp' annotation"
        return_type = func_sig.return_annotation
        fields.append((name, return_type))

    if len(fields) == 0:
        return None

    return defstruct(
        f"{comp.basename}ClientSettings",
        fields,
        tag=comp.identity,
        tag_field="component",
        module=f"{comp.module}.api",
    )


def evaluate(comp: Component, request, *, struct_type: type[TStruct]) -> TStruct:
    field_values = dict()
    for name, func in registry[comp.identity].items():
        field_values[name] = func(comp, request)
    return struct_type(**field_values)
