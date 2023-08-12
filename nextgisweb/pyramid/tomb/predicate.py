from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Callable, Dict, Optional, Tuple, Type


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
    context: Type
    deprecated: bool
    param_types: Dict[str, Tuple[type, Any]]
    body_type: Optional[type]
    return_type: Optional[type]


@dataclass
class RouteMeta(MetaPredicateBase):
    component: str
    template: str
    overloaded: bool
    client: bool
    wotypes: str
    mdtypes: Dict[str, str]


class ErrorRendererPredicate:
    def __init__(self, val, config):
        self.val = val

    def text(self):
        return "error_renderer"

    phash = __repr__ = text

    def __call__(self, context, request):
        return True
