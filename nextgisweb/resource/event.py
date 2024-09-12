from typing import Set, Type

from msgspec import Struct
from zope.event import notify
from zope.event.classhandler import handler

from .model import Resource


class AfterResourcePut:
    def __init__(self, resource, request):
        self.resource = resource
        self.request = request

    def __repr__(self):
        return self.__class__.__name__


class AfterResourceCollectionPost:
    def __init__(self, resource, request):
        self.resource = resource
        self.request = request

    def __repr__(self):
        return self.__class__.__name__


class OnChildClasses(Struct, kw_only=True):
    parent: Resource
    classes: Set[Type[Resource]]

    @classmethod
    def handler(cls, fn):
        handler(cls, fn)

    @classmethod
    def apply(cls, parent: Resource, classes: Set[Type[Resource]]) -> Set[Type[Resource]]:
        obj = cls(parent=parent, classes=classes)
        notify(obj)
        return obj.classes


class OnDeletePrompt(Struct, kw_only=True):
    resource: Resource
    result: bool = True

    @classmethod
    def handler(cls, fn):
        handler(cls, fn)

    @classmethod
    def apply(cls, resource: Resource) -> bool:
        obj = cls(resource=resource)
        notify(obj)
        return obj.result

    def veto(self):
        self.result = False
