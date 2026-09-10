from __future__ import annotations

from typing import Any, ClassVar, Final, Literal, cast

from nextgisweb.jsrealm import jsentry
from nextgisweb.pyramid.tomb import Request

from .model import Resource

type WidgetOperation = Literal["create", "update"]


class WidgetBase:
    # Hybrid attribute: tuple for class, single value for instance
    operation: tuple[WidgetOperation, ...] | WidgetOperation

    resource: ClassVar[type[Resource]] = Resource
    interface: ClassVar[type | None] = None

    obj: Final[Resource]
    request: Final[Request]

    def __init__(self, operation: WidgetOperation, obj: Resource, request: Request) -> None:
        self.operation = operation
        self.obj = obj
        self.request = request


_registry = []


class Widget(WidgetBase):
    amdmod: ClassVar[str]

    def __init_subclass__(cls) -> None:
        super().__init_subclass__()
        _registry.append(cls)

    def is_applicable(self) -> bool:
        assert isinstance(self.operation, str)

        return (
            (self.operation in type(self).operation)
            and (isinstance(self.obj, self.resource))
            and ((iface := self.interface) is None or cast(Any, iface).providedBy(self.obj))
        )

    def config(self) -> dict:
        return dict()


class CompositeWidget(WidgetBase):
    def __init__(self, operation: WidgetOperation, obj: Resource, request: Request) -> None:
        super().__init__(operation, obj, request)
        self.members = []
        for mcls in _registry:
            member = mcls(operation, obj, request)
            if member.is_applicable():
                self.members.append(member)

    def config(self) -> dict:
        result = dict()
        for m in self.members:
            result[m.amdmod] = m.config()
        return result


class ResourceWidget(Widget):
    resource = Resource
    operation = ("create", "update")
    amdmod = jsentry("@nextgisweb/resource/editor-widget")


class ResourcePermissionWidget(Widget):
    resource = Resource
    operation = ("update",)
    amdmod = jsentry("@nextgisweb/resource/permissions-widget")


class ResourceDescriptionWidget(Widget):
    resource = Resource
    operation = ("create", "update")
    amdmod = jsentry("@nextgisweb/resource/description-editor")
