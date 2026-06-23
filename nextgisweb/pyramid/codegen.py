import ast
import inspect
import re
import textwrap
from collections import defaultdict
from collections.abc import Sequence
from itertools import chain, count
from json import dumps as json_dumps
from typing import Any, Literal, Type, Union, cast

from msgspec import NODEFAULT, Struct, UnsetType, defstruct, field
from pyramid.response import Response

from nextgisweb.lib.apitype import unannotate

from nextgisweb.jsrealm.tsgen import TSGenerator

from .component import PyramidComponent
from .tomb import Configurator, iter_routes

counter = lambda c=count(1): next(c)


class Operation(Struct, kw_only=True):
    query: dict[str, Any]
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
    path: dict[str, Any] = field(default_factory=dict)

    get: list[Operation] = field(default_factory=list)
    post: list[Operation] = field(default_factory=list)
    put: list[Operation] = field(default_factory=list)
    delete: list[Operation] = field(default_factory=list)
    patch: list[Operation] = field(default_factory=list)

    basename: str = field(default_factory=lambda: f"_Route{counter()}")

    def field(self, name: str) -> tuple[str, Type[Struct], Any]:
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


def eslint_disable(rules: Sequence[str] | bool) -> list[str]:
    result: list[str] = []

    if rules is False:
        pass
    elif rules is True:
        result.append("/* eslint-disable */")
    else:
        result.extend(f"/* eslint-disable {r} */" for r in rules)

    if len(result) > 0:
        result.append("")

    return result


def api_type(comp: PyramidComponent, config: Configurator) -> str:
    routes: dict[str, Route] = defaultdict(Route)
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
                    p.name: p.type if (p.default is NODEFAULT) else (p.type | UnsetType)
                    for p in chain(*(p.spreaded for p in iview.query_params.values()))
                }
            )
            op.set_if_supported("body", iview.body_type)
            op.set_if_supported("response", iview.return_type)
            if not op.is_empty():
                method_attr = iview.method.lower()
                if (meth := getattr(route, method_attr, None)) is not None:
                    cast(list[Operation], meth).append(op)

    routes_struct = defstruct("Routes", [v.field(k) for k, v in routes.items()])

    tsgen = TSGenerator()
    route_tsmodule = "@nextgisweb/pyramid/type/route"
    tsgen.add(routes_struct, export=(route_tsmodule, "Routes"))
    tsgen.add(routes_struct, export=(route_tsmodule, "default"))
    for tdef in comp.client_types:
        tsgen.add(tdef)

    eslint = eslint_disable(("prettier/prettier",))

    return "\n".join(eslint + [m.code for m in tsgen.compile()] + [""])


def route(comp: PyramidComponent, config: Configurator) -> str:
    data = json_dumps(comp.route_meta, ensure_ascii=False, indent=4)

    code = [
        *eslint_disable(("prettier/prettier",)),
        "const data: Record<string, string[]> = {};".format(data),
        "export default data;\n",
    ]

    return "\n".join(code)


def ts_identifier(value: str, suffix: str = "") -> str:
    parts = re.split(r"[^A-Za-z0-9]+", value)
    result = "".join(p[:1].upper() + p[1:] for p in parts if p)

    if not result:
        result = "Generated"

    if result[0].isdigit():
        result = f"_{result}"

    return f"{result}{suffix}"


def page_route(comp: PyramidComponent, config: Configurator) -> str:
    routes = []

    for route in iter_routes(config.registry.introspector):
        if not route.client:
            continue

        for view in route.views:
            if not view.react_spa or view.method not in (None, "GET"):
                continue

            assert view.react_renderer is not None

            routes.append(
                dict(
                    name=route.name,
                    path=re.sub(r"\{(\w+)(?::[^}]+)?\}", r":\1", route.ktemplate),
                    module=view.react_renderer,
                    route=route,
                    view=view,
                )
            )

    routes.sort(key=lambda item: (item["path"].count(":"), item["path"]))

    used_names: set[str] = set()

    def unique_identifier(value: str, suffix: str) -> str:
        base = ts_identifier(value, suffix)
        result = base
        counter = 2

        while result in used_names:
            result = f"{base}{counter}"
            counter += 1

        used_names.add(result)
        return result

    for item in routes:
        item["component_name"] = unique_identifier(item["name"], "Page")
        item["model_name"] = unique_identifier(item["name"], "PageModel")
        item["route_name"] = unique_identifier(item["name"], "Route")
        item["props_name"] = unique_identifier(item["name"], "PageProps")

    def js_key(name: str) -> str:
        if re.match(r"^[A-Za-z_$][A-Za-z0-9_$]*$", name):
            return name
        return json_dumps(name, ensure_ascii=False)

    def js_value(value: Any) -> str:
        return json_dumps(value, ensure_ascii=False)

    def param_is_number(param: Any) -> bool:
        return unannotate(param.type) is int

    def unwrap_view_func(func: Any) -> Any:
        while wrapped := getattr(func, "__wrapped__", None):
            func = wrapped
        return func

    def function_body(func: Any) -> list[ast.stmt]:
        source = textwrap.dedent(inspect.getsource(unwrap_view_func(func)))
        module = ast.parse(source)
        for node in module.body:
            if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                return node.body
        raise RuntimeError(f"Unable to inspect {func!r}")

    def attr_chain(node: ast.AST) -> list[str] | None:
        if isinstance(node, ast.Name):
            return [node.id]
        if isinstance(node, ast.Attribute):
            base = attr_chain(node.value)
            if base is None:
                return None
            return [*base, node.attr]
        return None

    def const_string(node: ast.AST) -> str | None:
        if isinstance(node, ast.Constant) and isinstance(node.value, str):
            return node.value
        return None

    def subscript_string(node: ast.AST) -> str | None:
        slice_node = node.slice
        if isinstance(slice_node, ast.Constant) and isinstance(slice_node.value, str):
            return slice_node.value
        return None

    def dict_items(node: ast.AST) -> list[tuple[str, ast.AST]] | None:
        if (
            isinstance(node, ast.Call)
            and isinstance(node.func, ast.Name)
            and node.func.id == "dict"
        ):
            result = []
            for kw in node.keywords:
                if kw.arg is None:
                    return None
                result.append((kw.arg, kw.value))
            return result

        if isinstance(node, ast.Dict):
            result = []
            for key, value in zip(node.keys, node.values):
                if (
                    key is None
                    or not isinstance(key, ast.Constant)
                    or not isinstance(key.value, str)
                ):
                    return None
                result.append((key.value, value))
            return result

        return None

    def expr_to_ts(node: ast.AST, env: dict[str, str]) -> str | None:
        if isinstance(node, ast.Constant):
            if node.value is None or isinstance(node.value, (bool, int, float, str)):
                return js_value(node.value)
            return None

        if isinstance(node, ast.Name):
            return env.get(node.id)

        if isinstance(node, ast.UnaryOp) and isinstance(node.op, ast.Not):
            operand = expr_to_ts(node.operand, env)
            return None if operand is None else f"!({operand})"

        if isinstance(node, ast.Attribute):
            if attr_chain(node) == ["request", "context", "id"]:
                return env.get("id")
            return None

        if isinstance(node, ast.Subscript) and attr_chain(node.value) == ["request", "matchdict"]:
            key = subscript_string(node)
            return None if key is None else env.get(key)

        if isinstance(node, ast.Call):
            if isinstance(node.func, ast.Name) and node.func.id == "int" and len(node.args) == 1:
                return expr_to_ts(node.args[0], env)

            if (
                isinstance(node.func, ast.Name)
                and node.func.id == "gettext"
                and len(node.args) == 1
            ):
                message = const_string(node.args[0])
                return None if message is None else f"gettext({js_value(message)})"

            return None

        if isinstance(node, ast.BinOp) and isinstance(node.op, ast.Mod):
            template = expr_to_ts(node.left, env)
            if template is None:
                return None

            if isinstance(node.right, ast.Tuple):
                values = [expr_to_ts(elt, env) for elt in node.right.elts]
            else:
                values = [expr_to_ts(node.right, env)]

            if any(value is None for value in values):
                return None

            return f"formatPercentTemplate({template}, {', '.join(cast(list[str], values))})"

        return None

    def compile_return_dict(
        func: Any, route_params: dict[str, Any]
    ) -> tuple[dict[str, ast.AST], dict[str, str]]:
        env = {name: name for name in route_params}
        body = function_body(func)

        for stmt in body:
            if (
                isinstance(stmt, ast.Assign)
                and len(stmt.targets) == 1
                and isinstance(stmt.targets[0], ast.Name)
            ):
                expr = expr_to_ts(stmt.value, env)
                if expr is not None:
                    env[stmt.targets[0].id] = expr
                continue

            if isinstance(stmt, ast.AnnAssign) and isinstance(stmt.target, ast.Name):
                expr = expr_to_ts(stmt.value, env) if stmt.value is not None else None
                if expr is not None:
                    env[stmt.target.id] = expr
                continue

            if isinstance(stmt, ast.Return):
                items = dict_items(stmt.value) if stmt.value is not None else None
                if items is None:
                    raise RuntimeError(
                        f"Unable to infer SPA page model from {func!r}: return dict expected"
                    )
                return dict(items), env

        raise RuntimeError(
            f"Unable to infer SPA page model from {func!r}: return statement not found"
        )

    layout_fields = {
        "layout_mode": "layoutMode",
        "maxwidth": "maxwidth",
        "maxheight": "maxheight",
        "hide_resource_filter": "hideResourceFilter",
        "hide_menu": "hideMenu",
    }

    def compile_page_model(item: dict[str, Any]) -> list[str]:
        route = item["route"]
        view = item["view"]
        model_name = item["model_name"]
        module = item["module"]
        route_params = route.path_params
        return_dict, env = compile_return_dict(view.func, route_params)

        lines = [f"function {model_name}({{ params }}: PageModelRouteContext): PageModelPatch {{"]

        for name, param in route_params.items():
            if param_is_number(param):
                expr = f"numberClientRouteParam(params, {js_value(name)})"
            else:
                expr = f"requireClientRouteParam(params, {js_value(name)})"
            lines.append(f"    const {name} = {expr};")

        props_lines = []
        props_expr = return_dict.get("props")
        props_items = dict_items(props_expr) if props_expr is not None else []
        if props_items is None:
            props_items = []

        for key, value in props_items:
            expr = expr_to_ts(value, env)
            if expr is not None:
                props_lines.append(f"            {js_key(key)}: {expr},")

        model_lines = [
            f"        entrypoint: {js_value(module)},",
            "        entrypointProps: {",
            *props_lines,
            "        },",
        ]

        for source_key, target_key in (("title", "title"), ("header", "header")):
            if source_key in return_dict:
                expr = expr_to_ts(return_dict[source_key], env)
                if expr is not None:
                    model_lines.append(f"        {target_key}: {expr},")

        for source_key, target_key in layout_fields.items():
            if source_key in return_dict:
                expr = expr_to_ts(return_dict[source_key], env)
                if expr is not None:
                    model_lines.append(f"        {target_key}: {expr},")

        if "obj" in return_dict and "id" in env:
            model_lines.append(f"        dynMenuResourceId: {env['id']},")

        lines.extend(
            [
                "    return {",
                *model_lines,
                "    };",
                "}",
                "",
            ]
        )
        return lines

    code = [
        *eslint_disable(("prettier/prettier", "import-x/order")),
        'import { createElement, lazy } from "react";',
        'import type { ComponentType, LazyExoticComponent } from "react";',
        "",
        'import { gettext } from "@nextgisweb/pyramid/i18n";',
        'import { BaseLayout, useCurrentPageModel } from "@nextgisweb/pyramid/layout/BaseLayout";',
        'import { formatPercentTemplate, numberClientRouteParam, requireClientRouteParam } from "@nextgisweb/pyramid/layout/clientPageRouteUtil";',
        "",
        'import type { RouteObject } from "react-router-dom";',
        'import type { PageModelPatch, PageModelRouteContext } from "@nextgisweb/pyramid/layout/PageModel";',
        "",
    ]

    for item in routes:
        module = json_dumps(item["module"], ensure_ascii=False)
        component_name = item["component_name"]
        code.append(f"const {component_name} = lazy(() => import({module}));")

    code.append("")

    code.extend(
        [
            "type PageProps<T> = T extends LazyExoticComponent<infer C>",
            "    ? C extends ComponentType<infer P>",
            "        ? P",
            "        : never",
            "    : T extends ComponentType<infer P>",
            "      ? P",
            "      : never;",
            "",
        ]
    )

    for item in routes:
        component_name = item["component_name"]
        props_name = item["props_name"]

        code.append(f"type {props_name} = PageProps<typeof {component_name}>;")

    code.append("")

    for item in routes:
        code.extend(compile_page_model(item))

    for item in routes:
        component_name = item["component_name"]
        route_name = item["route_name"]
        props_name = item["props_name"]

        code.extend(
            [
                f"function {route_name}() {{",
                "    const model = useCurrentPageModel();",
                f"    const props = model.entrypointProps as {props_name};",
                f"    return createElement({component_name}, props);",
                "}",
                "",
            ]
        )

    code.extend(
        [
            "const data: RouteObject[] = [",
            "    {",
            "        Component: BaseLayout,",
            "        children: [",
        ]
    )

    for item in routes:
        name = json_dumps(item["name"], ensure_ascii=False)
        path = json_dumps(item["path"], ensure_ascii=False)
        route_name = item["route_name"]
        model_name = item["model_name"]

        code.extend(
            [
                "            {",
                f"                id: {name},",
                f"                path: {path},",
                f"                handle: {{ pageModel: {model_name} }},",
                f"                Component: {route_name},",
                "            },",
            ]
        )

    code.extend(
        [
            "        ],",
            "    },",
            "];",
            "",
            "export default data;",
            "",
        ]
    )

    return "\n".join(code)
