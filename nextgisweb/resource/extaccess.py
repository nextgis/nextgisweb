from __future__ import annotations

from typing import Type

from pyramid.request import Request
from zope.interface import Interface

from nextgisweb.lib.i18n import Translatable
from nextgisweb.lib.registry import list_registry

from .model import Resource


@list_registry
class ExternalAccessLink:
    title: Translatable
    help: Translatable | None = None
    docs_url: str | None = None

    resource: Type[Resource] | None = None
    interface: Type[Interface] | None = None
    attr_name: str | None = None

    url: str

    def __init__(self, url: str):
        self.url = url

    @classmethod
    def factory(cls, obj: Resource, request: Request) -> ExternalAccessLink | None:
        if cls.is_applicable(obj, request):
            return cls(cls.url_factory(obj, request))

    @classmethod
    def is_applicable(cls, obj: Resource, request: Request) -> bool:
        if (resource := cls.resource) is not None:
            if not isinstance(obj, resource):
                return False

        if (interface := cls.interface) is not None:
            if not interface.providedBy(obj):
                return False

        if (attr_name := cls.attr_name) is not None:
            if not getattr(obj, attr_name):
                return False

        return True

    @classmethod
    def url_factory(cls, obj: Resource, request: Request) -> str:
        raise NotImplementedError
