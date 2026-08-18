from msgspec import Struct

from nextgisweb.pyramid.tomb import Request

from ..component import WebMapComponent
from .base import WebMapOption, WebMapOptionCategory


class WebMapOptionItem(Struct, kw_only=True):
    identity: str
    label: str
    category: str
    order: int
    default: bool


class WebMapOptionCategoryItem(Struct, kw_only=True):
    identity: str
    label: str
    order: int


class WebMapOptionSchema(Struct, kw_only=True):
    options: dict[str, WebMapOptionItem]
    categories: dict[str, WebMapOptionCategoryItem]


def schema(request: Request) -> WebMapOptionSchema:
    """Read webmap options schema

    :returns: JSON schema for webmap options"""
    tr = request.translate
    options = {
        k: WebMapOptionItem(
            identity=k,
            label=tr(v.label),
            category=v.category.identity,
            order=v.order,
            default=v.default(),
        )
        for k, v in WebMapOption.registry.items()
    }
    categories = {
        k: WebMapOptionCategoryItem(
            identity=k,
            label=tr(v.label),
            order=v.order,
        )
        for k, v in WebMapOptionCategory.registry.items()
    }
    return WebMapOptionSchema(
        options=options,
        categories=categories,
    )


def setup_pyramid(comp: WebMapComponent, config):
    config.add_route(
        "webmap.option.schema",
        "/api/component/webmap/option/schema",
        get=schema,
    )
