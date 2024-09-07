from collections import defaultdict
from itertools import chain, count
from textwrap import dedent
from typing import Any, Dict, List, Literal, Sequence, Tuple, Type, Union, cast

from msgspec import NODEFAULT, Struct, UnsetType, defstruct, field
from pyramid.response import Response

from nextgisweb.lib.apitype import unannotate

from nextgisweb.jsrealm.tsgen import TSGenerator

from .tomb import iter_routes

counter = lambda c=count(1): next(c)


class Operation(Struct, kw_only=True):
    query: Dict[str, Any]
    body: Any = UnsetType
    response: Any = UnsetType
    has_types: bool = False

    basename: str = field(default_factory=lambda: f"_Operation{counter()}")

    def set_if_supported(self, attr: Literal["body", "response"], type: Any):
        otype = unannotate(type)
        if otype is None or otype is Response:
            return False
        self.has_types = True
        setattr(self, attr, type)

    def is_empty(self):
        return not self.has_types and len(self.query) == 0

    def struct(self) -> Type[Struct]:
        fields = list()
        if len(self.query) > 0:
            query_struct = defstruct(f"{self.basename}Query", list(self.query.items()))
            fields.append(("query", query_struct))
        if self.body is not UnsetType:
            fields.append(("body", self.body))
        if self.response is not UnsetType:
            fields.append(("response", self.response))
        return defstruct(self.basename, fields)


class Route(Struct, kw_only=True):
    path: Dict[str, Any] = field(default_factory=dict)

    get: List[Operation] = field(default_factory=list)
    post: List[Operation] = field(default_factory=list)
    put: List[Operation] = field(default_factory=list)
    delete: List[Operation] = field(default_factory=list)
    patch: List[Operation] = field(default_factory=list)

    basename: str = field(default_factory=lambda: f"_Route{counter()}")

    def field(self, name: str) -> Tuple[str, Type[Struct], Any]:
        fields = list()
        fields.append(("path_obj", self.type_path_obj(), field(name="pathObj")))
        fields.append(("path_arr", self.type_path_arr(), field(name="pathArr")))
        for a in self.__struct_fields__:
            if a not in ("path", "basename") and len(val := getattr(self, a)) > 0:
                fields.append((a, union([t.struct() for t in val])))
        return (f"f{id(name)}", defstruct(self.basename, fields), field(name=name))

    def type_path_obj(self) -> Type[Struct]:
        return defstruct(f"{self.basename}PathObj", list(self.path.items()))

    def type_path_arr(self) -> Type[Struct]:
        return defstruct(f"{self.basename}PathArr", list(self.path.items()), array_like=True)

    def is_empty(self):
        return all(len(getattr(self, a)) == 0 for a in self.__struct_fields__ if a != "basename")


def union(t: Sequence[Any]) -> Any:
    assert len(t) > 0
    return t[0] if len(t) == 1 else Union[tuple(t)]  # type: ignore


def eslint_disable(rules: Union[Sequence[str], bool]) -> List[str]:
    result: List[str] = []

    if rules is False:
        pass
    elif rules is True:
        result.append("/* eslint-disable */")
    else:
        result.extend(f"/* eslint-disable {r} */" for r in rules)

    if len(result) > 0:
        result.append("")

    return result


def api_type_module(config) -> str:
    routes: Dict[str, Route] = defaultdict(Route)
    for iroute in iter_routes(config.registry.introspector):
        is_api = iroute.itemplate.startswith("/api/")
        if not is_api and not iroute.client:
            continue

        route = routes[iroute.name]
        route.path = {p.name: p.type for p in iroute.path_params.values()}
        if not is_api:
            continue

        for iview in iroute.views:
            if iview.method is None:
                continue

            op = Operation(
                query={
                    p.name: p.type if (p.default is NODEFAULT) else Union[(p.type, UnsetType)]
                    for p in chain(*(p.spreaded for p in iview.query_params.values()))
                }
            )
            op.set_if_supported("body", iview.body_type)
            op.set_if_supported("response", iview.return_type)
            if not op.is_empty():
                method_attr = iview.method.lower()
                if (meth := getattr(route, method_attr, None)) is not None:
                    cast(List[Operation], meth).append(op)

    routes_struct = defstruct("Routes", [v.field(k) for k, v in routes.items()])

    tsgen = TSGenerator()
    route_tsmodule = "@nextgisweb/pyramid/type/route"
    tsgen.add(routes_struct, export=(route_tsmodule, "Routes"))
    tsgen.add(routes_struct, export=(route_tsmodule, "default"))

    eslint = eslint_disable(
        (
            "prettier/prettier",
            "import/newline-after-import",
            "import/order",
            "@typescript-eslint/no-explicit-any",
        )
    )

    return "\n".join(eslint + [m.code for m in tsgen.compile()] + [""])


def api_load_module(config) -> str:
    code = [*eslint_disable(("import/newline-after-import",))]

    template = """
        declare module "@nextgisweb/pyramid/api/load!{path}" {{
            import type route from "@nextgisweb/pyramid/type/route";
            const value: route["{name}"]["get"]["response"];
            export = value;
        }}
    """
    template = dedent(template).strip("\n") + "\n"

    for iroute in iter_routes(config.registry.introspector):
        if not iroute.load_types:
            continue

        code.append(
            template.format(
                path=iroute.itemplate,
                name=iroute.name,
            )
        )

    return "\n".join(code)
