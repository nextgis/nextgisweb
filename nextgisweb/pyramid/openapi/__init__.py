from collections import defaultdict
from itertools import chain
from typing import Any, Dict

from msgspec import NODEFAULT, UNSET
from msgspec.inspect import Metadata, type_info
from msgspec.json import schema_components

from nextgisweb.env import Component, inject
from nextgisweb.lib.apitype import ContentType as CType
from nextgisweb.lib.apitype import JSONType, annotate, iter_anyof, unannotate
from nextgisweb.lib.apitype import StatusCode as SCode

from ..component import PyramidComponent
from ..tomb import is_json_type, iter_routes
from .docstring import Doctring


def _apply_json_content_type(ct, tdef):
    if ct == CType.EMPTY and is_json_type(unannotate(tdef)):
        return CType.JSON
    return ct


def _del_if_none(obj, *keys):
    for key in keys:
        if obj.get(key, NODEFAULT) is None:
            del obj[key]


def _del_if_false(obj, *keys):
    for key in keys:
        if obj.get(key, NODEFAULT) is False:
            del obj[key]


def _pfact(pin, **defaults):
    res = list()

    def _append(name, **kwargs):
        obj = dict()
        obj["in"] = pin
        obj["name"] = name
        obj.update(defaults)
        obj.update(kwargs)
        _del_if_none(obj, "description")
        res.append(obj)

    return res, _append


def _ctag(cid):
    return Component.registry[cid].basename


def _context_str(context):
    if context is None:
        return None
    if identity := getattr(context, "identity", None):
        return identity
    return context.__name__


def _context_param(value):
    desc = "OpenAPI discriminator for overloaded operations ignored during request processing"
    return dict(schema=dict(type="string", enum=[value]), description=desc)


@inject()
def openapi(introspector, prefix="/api/", *, comp: PyramidComponent):
    doc: Dict[str, Any] = dict(openapi="3.1.0")

    info = doc["info"] = dict()
    distr = comp.env.options.with_prefix("distribution")
    if distr_description := distr.get("description"):
        info["title"] = distr_description
    if distr_version := distr.get("version"):
        info["version"] = distr_version

    paths = doc["paths"] = defaultdict(dict)
    components = doc["components"] = dict()

    schema_refs = []

    def schema_ref(tdef, default=UNSET):
        if tdef is JSONType:
            return {}

        ref = dict()
        if default not in (UNSET, NODEFAULT):
            ref["default"] = default

        schema_refs.append((tdef, ref))
        return ref

    def schema_for_json(ct, tdef):
        result = dict()
        if ct == CType.JSON:
            result["schema"] = schema_ref(tdef)
        return result

    # Paths
    for route in iter_routes(introspector):
        if not route.itemplate.startswith(prefix):
            continue

        # Operations
        for view in route.views:
            if not isinstance(view.method, str) or not view.openapi:
                continue

            # Path parameters
            view_path_params_renamed = {p.name: p for p in view.path_params.values()}
            p_params, p_param = _pfact("path", required=True)
            for pname, pobj in route.path_params.items():
                ptype = pobj.type
                if (pvobj := view_path_params_renamed.get(pname)) is not None:
                    ptype = annotate(ptype, pvobj.extras)
                p_kwargs = dict()
                ti = type_info(ptype)
                if isinstance(ti, Metadata) and (ejs := ti.extra_json_schema):
                    if desc := ejs.get("description"):
                        p_kwargs.update(description=desc)
                p_param(pname, schema=schema_ref(ptype), **p_kwargs)

            o_params, o_param = _pfact("query", explode=False)

            # Handle operation overloading
            oper_pattern = route.ktemplate
            oper_context = _context_str(view.context)
            assert isinstance(route.overloaded, bool)
            if route.overloaded:
                oper_pattern += f"?context={oper_context}"
                o_param("context", **_context_param(oper_context))

            # Create operation object
            oper: Dict[str, Any] = dict(
                tags=[_ctag(view.component)],
                deprecated=view.deprecated,
            )

            # Register operation at path
            paths[oper_pattern][view.method.lower()] = oper

            # Parse function docstring
            dstr = Doctring(view.func)
            oper["summary"] = dstr.short
            oper["description"] = dstr.long

            # Add extended properties
            oper["x-nextgisweb-route"] = route.name
            oper["x-nextgisweb-overloaded"] = route.overloaded
            oper["x-nextgisweb-component"] = view.component
            oper["x-nextgisweb-context"] = oper_context

            _del_if_none(oper, "summary", "description", "x-nextgisweb-context")
            _del_if_false(oper, "deprecated", "x-nextgisweb-overloaded")

            # Operation parameters
            for param in chain(*(p.spreaded for p in view.query_params.values())):
                if (pdesc := dstr.params.get(param.name)) is None:
                    ti = type_info(param.type)
                    if isinstance(ti, Metadata) and (ejs := ti.extra_json_schema):
                        pdesc = ejs.get("description")

                o_param(
                    param.name,
                    style=param.style.value,
                    required=param.default is NODEFAULT,
                    schema=schema_ref(param.type, param.default),
                    description=pdesc,
                )

            # Merge path and operation parameters
            oper["parameters"] = p_params + o_params

            # Request body
            if btype := view.body_type:
                rbody = oper["requestBody"] = dict()
                rbody_content = rbody["content"] = dict()
                for t, ct in iter_anyof(btype, CType()):
                    ct = _apply_json_content_type(ct, t)
                    rbody_content[str(ct)] = schema_for_json(ct, t)
                    rbody["required"] = True

            # Responses
            responses = oper["responses"] = defaultdict(lambda: dict(content=defaultdict(list)))
            if rtype := view.return_type:
                for t, sc, ct in iter_anyof(rtype, SCode(200), CType()):
                    ct = _apply_json_content_type(ct, t)
                    response = responses[str(sc)]
                    response["description"] = dstr.returns
                    _del_if_none(response, "description")
                    if ct != CType.EMPTY:
                        response["content"][str(ct)].append(schema_for_json(ct, t))

    # Sort paths by path components
    doc["paths"] = dict(sorted(paths.items(), key=lambda i: i[0].split("/")))

    # Expand schema references
    schemas, components["schemas"] = schema_components(
        [i[0] for i in schema_refs],
        "#/components/schemas/{name}",
    )

    for pschema, r in zip(schemas, [i[1] for i in schema_refs]):
        r.update(pschema)

    for path_obj in doc["paths"].values():
        for meth_object in path_obj.values():
            for sc, sc_obj in meth_object["responses"].items():
                for ct, ct_arr in list(sc_obj["content"].items()):
                    subst = None
                    if len(ct_arr) == 1:
                        subst = ct_arr[0]
                    else:
                        one_off = [ct_itm["schema"] for ct_itm in ct_arr]
                        subst = dict(schema=dict(oneOf=one_off))
                    sc_obj["content"][ct] = subst

    return doc
