from collections import defaultdict
from typing import TYPE_CHECKING, Annotated, Any, Literal, cast

import sqlalchemy as sa
from msgspec import UNSET, Meta, Struct, defstruct
from typing_extensions import get_annotations

from nextgisweb.env import DBSession
from nextgisweb.lib.apitype import Gap, fillgap

from nextgisweb.auth import User
from nextgisweb.pyramid.tomb import Configurator

from ..api import SearchAttrParams, SearchRootParams
from ..component import ResourceComponent
from ..model import Resource, ResourceID
from ..permission import Scope
from ..scope import ResourceScope
from ..serialize import SAttribute, Serializer
from .base import ResourceAttr, ResourceAttrSAttribute, register_sattributess
from .resource import ResourcePermissionGap


class ResourceAttrRequestContext(Struct, kw_only=True):
    request: Any

    @property
    def user(self) -> User:
        return self.request.user

    @property
    def translate(self):
        return self.request.localizer.translate


class ResourceAttrResourcesSearch(Struct, kw_only=True, tag="search"):
    def query(self):
        root = cast(SearchRootParams, self._part(SearchRootParams))
        attr = cast(SearchAttrParams, self._part(SearchAttrParams))
        return root.query().where(*attr.filters())

    def _part(self, st: type[Struct]) -> Struct:
        kwargs = {k: getattr(self, k, UNSET) for k in st.__struct_fields__}
        return st(**kwargs)

    @classmethod
    def _with_fields(cls):
        fields = list()
        for s in (SearchRootParams, SearchAttrParams):
            annotations = get_annotations(s, eval_str=True)
            for f in s.__struct_fields__:
                fields.append((f, annotations[f], UNSET))
        return defstruct("ResourceAttrResourcesSearch", fields, bases=(cls,))


if not TYPE_CHECKING:
    ResourceAttrResourcesSearch = ResourceAttrResourcesSearch._with_fields()


ResourceAttrRequestAttrGap = Gap("ResourceAttrRequestAttrGap", ResourceAttr)


class ResourceAttrRequest(Struct, kw_only=True):
    resources: (
        Annotated[list[ResourceID], Meta(description="List of resource IDs")]
        | Annotated[ResourceAttrResourcesSearch, Meta(description="Search for resources")]
    )
    attributes: Annotated[
        list[ResourceAttrRequestAttrGap],
        Meta(
            description="Attributes to fetch with parameters (if any) as a list",
            examples=[[["resource.cls"], ["resource.has_permission", "resource.read"]]],
        ),
    ]


class _Value(Struct, array_like=True, tag=0, tag_field="error"):
    value: Any


class _Forbidden(Struct, array_like=True, tag=1, tag_field="error"):
    pass


class ResourceAttrResponseItem(Struct, array_like=True):
    id: ResourceID
    values: Annotated[
        list[_Value | _Forbidden],
        Meta(
            description="List of attribute values, in the same order as the "
            "request's `attributes` field. `[0, value]` indicates a successful "
            "value retrieval, while `[1]` indicates a forbidden access."
        ),
    ]


class ResourceAttrResponse(Struct, kw_only=True):
    items: list[ResourceAttrResponseItem]


def attr(request, *, body: ResourceAttrRequest) -> ResourceAttrResponse:
    """Fetch specific resource attributes"""
    user = request.user

    others: list[tuple[int, ResourceAttr]] = []
    from_serializer = defaultdict[
        type[Serializer],
        list[tuple[int, SAttribute, ResourceAttr]],
    ](list)

    for idx, attr in enumerate(body.attributes):
        if isinstance(attr, ResourceAttrSAttribute):
            sattr = attr.sattribute
            from_serializer[sattr.srlzrcls].append((idx, sattr, attr))
        else:
            others.append((idx, attr))

    if isinstance(body.resources, list):
        query = sa.select(Resource).where(Resource.id.in_(body.resources))
    else:
        query = body.resources.query()

    ctx = ResourceAttrRequestContext(request=request)
    result: list[ResourceAttrResponseItem] = []
    for (res,) in DBSession.execute(query):
        if not res.has_permission(ResourceScope.read, user=user):
            continue
        values: list[Any] = [None] * len(body.attributes)
        for srlzr_cls, attrs in from_serializer.items():
            if not srlzr_cls.is_applicable(res):
                continue
            srlzr = srlzr_cls(res, user=user)
            for idx, sattr, attr in attrs:
                sattr.serialize(srlzr)
                if (value := srlzr.data.get(sattr.attrname, UNSET)) is UNSET:
                    values[idx] = _Forbidden()
                else:
                    values[idx] = _Value(value)
        for idx, attr in others:
            values[idx] = _Value(attr(res, ctx=ctx))

        result.append(ResourceAttrResponseItem(id=res.id, values=values))

    return ResourceAttrResponse(items=result)


def setup_pyramid(comp: ResourceComponent, config: Configurator):
    register_sattributess()

    fillgap(ResourceAttrRequestAttrGap, ResourceAttr.argument_type())

    permissions = list()
    for scope_cls in Scope.registry.values():
        for perm in scope_cls.values():
            permissions.append(f"{scope_cls.identity}.{perm.name}")
    fillgap(ResourcePermissionGap, Literal[tuple(permissions)])

    comp.env.pyramid.client_type(ResourceAttr.helper_struct())

    config.add_route(
        "resource.attr",
        "/api/component/resource/attr",
        post=attr,
    )
