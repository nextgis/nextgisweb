from dataclasses import dataclass
from typing import Generator

from pyramid.config.actions import ActionInfo

from .predicate import RouteMeta, ViewMeta


@dataclass
class ViewInspector(ViewMeta):
    method: str
    info: ActionInfo


@dataclass
class RouteInspector(RouteMeta):
    name: str
    views: Generator[ViewInspector, None, None]


def iter_routes(introspector) -> Generator[RouteInspector, None, None]:
    def views(related) -> Generator[ViewInspector, None, None]:
        for itm in filter(lambda i: i.category_name == "views", related):
            if meta := ViewMeta.select(itm["predicates"]):
                method = itm["request_methods"]
                yield ViewInspector(
                    **meta.__dict__,
                    method=method,
                    info=itm.action_info,
                )

    if routes := introspector.get_category("routes"):
        for itm in routes:
            route = itm["introspectable"]["object"]
            if meta := RouteMeta.select(route.predicates):
                yield RouteInspector(
                    **meta.__dict__,
                    name=route.name,
                    views=views(itm["related"]),
                )
