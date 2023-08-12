from collections import defaultdict

from msgspec import UNSET, Meta
from msgspec.json import schema_components
from typing_extensions import Annotated

from nextgisweb.env import Component
from nextgisweb.lib.apitype import ContentType as CType
from nextgisweb.lib.apitype import JSONType, deannotated, is_optional, iter_anyof
from nextgisweb.lib.apitype import StatusCode as SCode

from ..tomb import is_json_type, iter_routes
from .docstring import Doctring

_PATH_TYPE = dict(
    int=int,
    uint=Annotated[int, Meta(ge=0)],
    str=str,
)


def _apply_json_content_type(ct, tdef):
    if ct == CType.EMPTY and is_json_type(deannotated(tdef)):
        return CType.JSON
    return ct


def _first_true(*args):
    return next((a for a in args if a is not None), None)


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


def openapi(introspector, prefix="/api/"):
    doc = dict(openapi="3.1.0")
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

        path = paths[route.wotypes] = dict()

        # Path parameters
        p_params, p_param = _pfact("path", required=True)
        for pname, ptype in route.mdtypes.items():
            p_param(pname, schema=schema_ref(_PATH_TYPE[ptype]))

        # Operations
        for view in route.views:
            if type(view.method) != str:
                continue

            dstr = Doctring(view.func)

            oper = path[view.method.lower()] = dict(
                tags=[_ctag(view.component)],
                summary=_first_true(dstr.short, route.name),
                description=_first_true(dstr.long),
                deprecated=view.deprecated,
            )

            # Operation parameters
            o_params, o_param = _pfact("query", style="form", explode=False)
            for pname, (ptype, pdefault) in view.param_types.items():
                o_param(
                    pname,
                    required=not is_optional(ptype)[0] and pdefault is UNSET,
                    schema=schema_ref(ptype, pdefault),
                    description=dstr.params.get(pname),
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
