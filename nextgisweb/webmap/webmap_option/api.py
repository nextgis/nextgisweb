from typing import Dict

from msgspec import Struct

from .base import WebMapOption, WebMapOptionCategory


class WebMapOptionItem(Struct, kw_only=True):
    identity: str
    label: str
    component: str
    name: str
    default: bool
    order: int
    category: str


class WebMapOptionCategoryItem(Struct, kw_only=True):
    identity: str
    label: str
    order: int


class WebMapOptionSchema(Struct, kw_only=True):
    options: Dict[str, WebMapOptionItem]
    categories: Dict[str, WebMapOptionCategoryItem]


def schema(request) -> WebMapOptionSchema:
    """Read webmap options schema"""
    tr = request.translate
    options = {
        k: WebMapOptionItem(
            identity=k,
            label=tr(v.label),
            component=v.component,
            name=v.name,
            default=v.default,
            category=v.category.identity,
            order=v.order,
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


def setup_pyramid(comp, config):
    config.add_route(
        "webmap.option.schema",
        "/api/component/webmap/option/schema",
        get=schema,
    )
