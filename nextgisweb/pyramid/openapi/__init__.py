import base64
from collections import defaultdict
from typing import Any, Dict

from msgspec import UNSET, Meta
from msgspec.inspect import Metadata, type_info
from msgspec.json import schema_components
from typing_extensions import Annotated

from nextgisweb.env import Component
from nextgisweb.lib.apitype import ContentType as CType
from nextgisweb.lib.apitype import JSONType, deannotated, is_optional, iter_anyof
from nextgisweb.lib.apitype import StatusCode as SCode

from ..tomb import is_json_type, iter_routes
from .docstring import Doctring


def _apply_json_content_type(ct, tdef):
    if ct == CType.EMPTY and is_json_type(deannotated(tdef)):
        return CType.JSON
    return ct


def _pfact(pin, **defaults):
    res = list()

    def _append(name, **kwargs):
        obj = dict()
        obj["in"] = pin
        obj["name"] = name
        obj.update(defaults)
        obj.update(kwargs)
        res.append(obj)

    return res, _append


def _ctag(cid):
    return Component.registry[cid].__name__[: -len("Component")]


def _context_str(context):
    if context is None:
        return None
    if identity := getattr(context, "identity", None):
        return identity
    return context.__name__


def _context_param(value):
    desc = "OpenAPI discriminator for overloaded operations ignored during request processing"
    return dict(schema=dict(type="string", enum=[value]), description=desc)


def openapi(introspector, prefix="/api/"):
    doc: Dict[str, Any] = dict(openapi="3.1.0")
    paths = doc["paths"] = defaultdict(dict)
    components = doc["components"] = dict()

    schema_refs = []

    def schema_ref(tdef, default=UNSET):
        if tdef is JSONType:
            return {}

        ref = dict()
        if default is not UNSET:
            ref["default"] = default

        schema_refs.append((tdef, ref))
        return ref

    def schema_for_json(obj, ct, tdef):
        if ct == CType.JSON:
            obj["schema"] = schema_ref(tdef)

    # Paths
    for route in iter_routes(introspector):
        if not route.template.startswith(prefix):
            continue

        # Path parameters
        p_params, p_param = _pfact("path", required=True)
        for pname, tdef in route.mdtypes.items():
            p_kwargs = dict()
            tinfo = type_info(tdef)
            if ejs := tinfo.extra_json_schema:
                if desc := ejs.get("description"):
                    p_kwargs.update(description=desc)
            p_param(pname, schema=schema_ref(tdef), **p_kwargs)

        # Operations
        for view in route.views:
            if not isinstance(view.method, str) or not view.openapi:
                continue

            o_params, o_param = _pfact("query", style="form", explode=False)

            # Handle operation overloading
            oper_pattern = route.wotypes
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

            # Operation parameters
            for pname, (ptype, pdefault) in view.param_types.items():
                if (pdesc := dstr.params.get(pname)) is None:
                    tinfo = type_info(ptype)
                    if isinstance(tinfo, Metadata) and (ejs := tinfo.extra_json_schema):
                        pdesc = ejs.get("description")

                o_param(
                    pname,
                    required=not is_optional(ptype)[0] and pdefault is UNSET,
                    schema=schema_ref(ptype, pdefault),
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
                    rbody_ct = rbody_content[str(ct)] = dict()
                    schema_for_json(rbody_ct, ct, t)
                    rbody["required"] = True

            # Responses
            responses = oper["responses"] = defaultdict(lambda: dict(content=dict()))
            if rtype := view.return_type:
                for t, sc, ct in iter_anyof(rtype, SCode(200), CType()):
                    ct = _apply_json_content_type(ct, t)
                    response = responses[str(sc)]
                    response["description"] = dstr.returns
                    if ct != CType.EMPTY:
                        rbody_ct = response["content"][str(ct)] = dict()
                        schema_for_json(rbody_ct, ct, t)

    # Sort paths by path components
    doc["paths"] = dict(sorted(paths.items(), key=lambda i: i[0].split("/")))

    # Expand schema references
    schemas, components["schemas"] = schema_components(
        [i[0] for i in schema_refs],
        "#/components/schemas/{name}",
    )

    for pschema, r in zip(schemas, [i[1] for i in schema_refs]):
        r.update(pschema)

    return doc
