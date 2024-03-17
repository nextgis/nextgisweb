from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Callable, Mapping, Optional, Sequence, Tuple

from pyramid.predicates import RequestMethodPredicate as PyramidRequestMethodPredicate
from pyramid.predicates import as_sorted_tuple  # type: ignore

from nextgisweb.lib.apitype import PathParam, QueryParam


class MetaPredicateBase:
    def text(self):
        return "meta"

    phash = text

    def __call__(self, context, request):
        return True

    @classmethod
    def select(cls, iterable):
        return next(filter(lambda p: isinstance(p, cls), iterable), None)

    @classmethod
    def as_predicate(cls):
        class Predicate(cls):
            def __new__(bcls, value, config):
                return value

        Predicate.__name__ = cls.__name__ + "Predicate"
        return Predicate


@dataclass
class ViewMeta(MetaPredicateBase):
    component: str
    func: Callable
    context: Any
    deprecated: bool
    openapi: bool
    path_params: Mapping[str, PathParam]
    query_params: Mapping[str, QueryParam]
    body_type: Optional[type]
    return_type: Optional[type]


@dataclass
class RouteMeta(MetaPredicateBase):
    component: str
    overloaded: bool
    client: bool
    load_types: bool
    itemplate: str
    ktemplate: str
    path_params: Mapping[str, PathParam]
    path_decoders: Sequence[Tuple[str, Callable[[str], Any]]]


class ErrorRendererPredicate:
    def __init__(self, val, config):
        self.val = val

    def text(self):
        return "error_renderer"

    phash = __repr__ = text

    def __call__(self, context, request):
        return True


class RequestMethodPredicate(PyramidRequestMethodPredicate):
    def __init__(self, val, config):
        # GET does not imply HEAD as Pyramid does
        self.val = as_sorted_tuple(val)
