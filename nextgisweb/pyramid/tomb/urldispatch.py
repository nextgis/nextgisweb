from __future__ import annotations

from collections.abc import Callable
from dataclasses import dataclass

from pyramid.interfaces import IRoute
from pyramid.urldispatch import Route as BaseRoute
from pyramid.urldispatch import RoutesMapper as BaseRoutesMapper
from pyramid.urldispatch import _compile_route
from zope.interface import implementer

from .predicate import RouteMeta
from .types import ContextFactory


@implementer(IRoute)
@dataclass
class Route(BaseRoute):
    """IRoute implementation storing additional route metadata in :py:attr:`meta`."""

    name: str
    pattern: str | None
    factory: ContextFactory | None
    predicates: tuple[object, ...]
    pregenerator: Callable | None
    meta: RouteMeta | None

    def __post_init__(self):
        self.match, self.generate = _compile_route(self.pattern)


class RoutesMapper(BaseRoutesMapper):
    """Routes mapper using :py:class:`Route` to store additional route metadata."""

    def connect(
        self,
        name: str,
        pattern: str,
        factory: Callable | None = None,
        predicates: tuple[object, ...] = (),
        pregenerator: Callable | None = None,
        static: bool = False,
    ) -> Route:
        if name in self.routes:
            old_route = self.routes[name]
            if old_route in self.routelist:
                self.routelist.remove(old_route)

        meta = next((p for p in predicates if isinstance(p, RouteMeta)), None)
        pfiltered = tuple(p for p in predicates if not isinstance(p, RouteMeta))

        route = Route(
            name,
            pattern,
            factory=factory,
            predicates=pfiltered,
            pregenerator=pregenerator,
            meta=meta,
        )

        if static:
            self.static_routes.append(route)
        else:
            self.routelist.append(route)

        self.routes[name] = route
        return route
