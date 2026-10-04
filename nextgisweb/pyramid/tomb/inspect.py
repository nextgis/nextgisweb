from __future__ import annotations

from collections.abc import Generator
from dataclasses import dataclass, fields

from pyramid.config.actions import ActionInfo

from .predicate import RouteMeta, ViewMeta
from .types import RequestMethodType, RequestMethodValues
from .urldispatch import Route


@dataclass
class ViewInspector(ViewMeta):
    method: RequestMethodType | None
    info: ActionInfo


@dataclass
class RouteInspector(RouteMeta):
    name: str
    views: Generator[ViewInspector, None, None]


def iter_routes(introspector) -> Generator[RouteInspector, None, None]:
    def views(related) -> Generator[ViewInspector, None, None]:
        for itm in filter(lambda i: i.category_name == "views", related):
            if view_meta := itm.get("view_meta"):
                assert isinstance(view_meta, ViewMeta)

                method = itm["request_methods"]
                assert method is None or method in RequestMethodValues

                yield ViewInspector(
                    **view_meta.__dict__,
                    method=method,
                    info=itm.action_info,
                )

    if routes := introspector.get_category("routes"):
        for itm in routes:
            route: Route = itm["introspectable"]["object"]
            if route_meta := route.meta:
                assert isinstance(route_meta, RouteMeta)

                yield RouteInspector(
                    **{f.name: getattr(route_meta, f.name) for f in fields(route_meta)},
                    name=route.name,
                    views=views(itm["related"]),
                )
