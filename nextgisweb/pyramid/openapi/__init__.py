from collections import defaultdict

from msgspec import UNSET, Meta
from msgspec.json import schema_components
from typing_extensions import Annotated

from nextgisweb.env import Component
from nextgisweb.lib.apitype import ContentType as CType
from nextgisweb.lib.apitype import JSONType, deannotated, is_optional
from nextgisweb.lib.apitype import StatusCode as SCode
from nextgisweb.lib.apitype import enumerate_anyof as iter_anyof

from ..config import is_json_type
from ..util import RouteMetaPredicate, ViewMetaPredicate
from .docstring import Doctring


def route_views(source):
    for itm in source["related"]:
        if itm.category_name != "views":
            continue

        m = itm["request_methods"]
        if not isinstance(m, str):
            continue

        meta = None
        for pmeta in itm["predicates"]:
            if isinstance(pmeta, ViewMetaPredicate):
                meta = pmeta.value
        if meta is None:
            continue

        yield m.lower(), meta


def routes(introspector, *, prefix):
    for itm in introspector.get_category("routes"):
        route = itm["introspectable"]["object"]

        meta = None
        for pmeta in route.predicates:
            if isinstance(pmeta, RouteMetaPredicate):
                meta = pmeta.value
                break
        if meta is None:
            continue

        if not meta.client or not meta.wotypes.startswith(prefix):
            continue

        yield route.name, meta, route_views(itm)


PATH_PARAM_SCHEMA = dict(
    int=int,
    uint=Annotated[int, Meta(ge=0)],
    str=str,
)


def apply_json_content_type(ct, tdef):
    if ct == CType.EMPTY and is_json_type(deannotated(tdef)):
        return CType.JSON
    return ct


def first_true(*args):
    return next((a for a in args if a is not None), None)


def pfact(pin, **defaults):
    res = list()

    def _append(name, **kwargs):
        obj = dict()
        obj["in"] = pin
        obj["name"] = name
        obj.update(defaults)
        obj.update(kwargs)
        res.append(obj)

    return res, _append


def ctag(cid):
    return Component.registry[cid].__name__[:-len('Component')]


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
    for route_name, meta, views in routes(introspector, prefix=prefix):
        path = paths[meta.wotypes] = dict()

        # Path parameters
        p_params, p_param = pfact("path", required=True)
        for pname, ptype in meta.mdtypes.items():
            p_param(pname, schema=schema_ref(PATH_PARAM_SCHEMA[ptype]))

        # Operations
        for m, vmeta in views:
            dstr = Doctring(vmeta.func)

            oper = path[m] = dict(
                tags=[ctag(vmeta.component)],
                summary=first_true(dstr.short, route_name),
                description=first_true(dstr.long),
                deprecated=vmeta.deprecated,
            )

            # Operation parameters
            o_params, o_param = pfact("query", style="form", explode=False)
            for pname, (ptype, pdefault) in vmeta.param_types.items():
                o_param(
                    pname,
                    required=not is_optional(ptype)[0] and pdefault is UNSET,
                    schema=schema_ref(ptype, pdefault),
                    description=dstr.params.get(pname),
                )

            # Merge path and operation parameters
            oper["parameters"] = p_params + o_params

            # Request body
            if btype := vmeta.body_type:
                rbody = oper["requestBody"] = dict()
                rbody_content = rbody["content"] = dict()
                for t, ct in iter_anyof(btype, CType()):
                    ct = apply_json_content_type(ct, t)
                    rbody_ct = rbody_content[str(ct)] = dict()
                    schema_for_json(rbody_ct, ct, t)
                    rbody["required"] = True

            # Responses
            responses = oper["responses"] = defaultdict(lambda: dict(content=dict()))
            if rtype := vmeta.return_type:
                for t, sc, ct in iter_anyof(rtype, SCode(200), CType()):
                    ct = apply_json_content_type(ct, t)
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
