from datetime import datetime
from inspect import Parameter, signature
from typing import Annotated, Union

from msgspec import UNSET, Struct, UnsetType, to_builtins
from pyramid.httpexceptions import HTTPNotFound

from nextgisweb.env import DBSession
from nextgisweb.lib.apitype import AsJSON, EmptyObject
from nextgisweb.lib.datetime import utcnow_naive

from nextgisweb.jsrealm import TSExport
from nextgisweb.resource import ResourceCls, ResourceRef

from .base import ResourceFavorite
from .model import ResourceFavoriteModel as Model


class ResourceFavoriteSchemaItem(Struct):
    identity: str
    label: str
    icon: str
    route: Union[str, None]


def schema(request) -> AsJSON[dict[str, ResourceFavoriteSchemaItem]]:
    """Read resource favorites schema"""
    tr = request.translate
    return {
        k: ResourceFavoriteSchemaItem(
            identity=k,
            label=tr(v.label),
            icon=v.icon,
            route=v.route,
        )
        for k, v in ResourceFavorite.registry.items()
    }


class ResourceFavoriteCreate(Struct, kw_only=True):
    identity: str
    resource: ResourceRef


class ResourceFavoriteRef(Struct, kw_only=True):
    id: int


def cpost(request, body: ResourceFavoriteCreate) -> ResourceFavoriteRef:
    """Create resource favorite"""
    request.require_authenticated()

    data = to_builtins(body)
    component, kind = data.pop("identity").split(".", maxsplit=1)
    label = data.pop("label", None)
    del data["resource"]

    kwargs = dict(
        resource_id=body.resource.id,
        user_id=request.user.id,
        component=component,
        kind=kind,
        label=label,
        data=data,
    )

    obj = Model.filter_by(**kwargs).first()
    if obj is None:
        obj = Model(created=utcnow_naive(), **kwargs).persist()
        DBSession.flush()

    return ResourceFavoriteRef(id=obj.id)


class ResourceFavoriteRead(Struct, kw_only=True):
    id: int
    identity: str
    resource: ResourceRef
    label: Union[str, None]
    created: datetime
    url: str


class ResourceFavoriteResourceInfo(Struct, kw_only=True):
    id: int
    cls: ResourceCls
    parent: Union[ResourceRef, None]
    display_name: str


class ResourceFavoriteCollectionGetResponse(Struct):
    items: list[ResourceFavoriteRead]
    resources: list[ResourceFavoriteResourceInfo]


def cget(request) -> ResourceFavoriteCollectionGetResponse:
    """Read resource favorites and related resources summary"""
    request.require_authenticated()

    query = Model.filter_by(user_id=request.user.id)
    items: list[ResourceFavoriteRead] = []
    resources: dict[int, ResourceFavoriteResourceInfo] = {}
    for obj in query:
        cls = ResourceFavorite.registry[obj.identity]
        items.append(
            ResourceFavoriteRead(
                id=obj.id,
                identity=obj.identity,
                resource=ResourceRef(id=obj.resource_id),
                label=obj.label,
                created=obj.created,
                url=cls.url(obj, request=request),
            )
        )
        res = obj.resource
        while res is not None:
            if (rid := res.id) in resources:
                break
            parent = res.parent
            resources[rid] = ResourceFavoriteResourceInfo(
                id=rid,
                cls=res.cls,
                parent=ResourceRef(id=parent.id) if parent else None,
                display_name=res.display_name,
            )
            res = parent
    return ResourceFavoriteCollectionGetResponse(items, list(resources.values()))


class FeatureFavoriteItemPutBody(Struct, kw_only=True):
    label: Union[str, None, UnsetType] = UNSET


def iput(request, id: int, body: FeatureFavoriteItemPutBody) -> EmptyObject:
    """Update resource favorite"""
    request.require_authenticated()

    obj = Model.filter_by(id=id, user_id=request.user.id).first()
    if obj is None:
        raise HTTPNotFound

    if body.label is not UNSET:
        obj.label = body.label


def idelete(request, id: int) -> EmptyObject:
    """Delete resource favorite"""
    request.require_authenticated()

    if obj := Model.filter_by(id=id, user_id=request.user.id).first():
        DBSession.delete(obj)


def setup_pyramid(comp, config):
    config.add_route(
        "resource.favorite.schema",
        "/api/component/resource/favorite/schema",
        get=schema,
    )

    cpost_body = Annotated[
        Union[tuple(v.ctype for v in ResourceFavorite.registry.values())],
        TSExport(ResourceFavoriteCreate.__name__),
    ]

    cpost_sig = signature(cpost)
    cpost.__signature__ = cpost_sig.replace(
        parameters=[
            param
            if param.name != "body"
            else Parameter(
                "body",
                Parameter.POSITIONAL_OR_KEYWORD,
                annotation=AsJSON[cpost_body],
            )
            for param in cpost_sig.parameters.values()
        ]
    )

    config.add_route(
        "resource.favorite.collection",
        "/api/component/resource/favorite/",
        get=cget,
        post=cpost,
    )

    config.add_route(
        "resource.favorite.item",
        "/api/component/resource/favorite/{id}",
        types=dict(id=int),
        put=iput,
        delete=idelete,
    )
