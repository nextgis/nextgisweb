from __future__ import annotations

from typing import Optional, Type

from pyramid.request import Request
from zope.interface import Interface

from nextgisweb.lib.registry import list_registry

from .model import Resource


@list_registry
class ExternalAccessLink:
    title: str
    help: Optional[str] = None
    docs_url: Optional[str] = None

    resource: Optional[Type[Resource]] = None
    interface: Optional[Type[Interface]] = None
    attr_name: Optional[str] = None

    url: str

    def __init__(self, url: str):
        self.url = url

    @classmethod
    def factory(cls, obj: Resource, request: Request) -> Optional[ExternalAccessLink]:
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
