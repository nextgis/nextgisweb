from __future__ import annotations

from collections.abc import Callable, Mapping, Sequence
from dataclasses import dataclass
from typing import TYPE_CHECKING, Any, Final

from pyramid.predicates import RequestMethodPredicate as BaseRequestMethodPredicate
from pyramid.predicates import as_sorted_tuple

from nextgisweb.lib.apitype import PathParam, QueryParam

from .types import ViewFunc

if TYPE_CHECKING:
    from .config import CorsHeaders
    from .request import Request


class MetaPredicateBase:
    def text(self):
        return "meta"

    phash = text

    def __call__(self, context, request: Request):
        return True

    @classmethod
    def as_predicate(cls):
        class Predicate(cls if not TYPE_CHECKING else MetaPredicateBase):
            def __new__(bcls, value, config):
                return value

        Predicate.__name__ = cls.__name__ + "Predicate"
        return Predicate


@dataclass
class RouteMeta(MetaPredicateBase):
    component: str
    overloaded: bool
    client: bool
    cors_headers: CorsHeaders | None
    itemplate: str
    ktemplate: str
    path_params: Mapping[str, PathParam]
    path_decoders: Sequence[tuple[str, Callable[[str], Any]]]

    def __post_init__(self):
        self.is_api: Final = self.itemplate.startswith("/api/")


@dataclass
class ViewMeta(MetaPredicateBase):
    component: str
    func: ViewFunc
    context: Any
    deprecated: bool
    openapi: bool
    path_params: Mapping[str, PathParam]
    query_params: Mapping[str, QueryParam]
    body_type: type | None
    return_type: type | None
    react_renderer: str | None


class ErrorRendererPredicate:
    def __init__(self, val, config):
        self.val = val

    def text(self):
        return "error_renderer"

    phash = __repr__ = text

    def __call__(self, context, request: Request):
        return True


class RequestMethodPredicate(BaseRequestMethodPredicate):
    def __init__(self, val, config):
        # GET does not imply HEAD as Pyramid does
        self.val = as_sorted_tuple(val)
