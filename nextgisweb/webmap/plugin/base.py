from typing import Any, ClassVar

from nextgisweb.lib.registry import ListRegistry, list_registry

from nextgisweb.auth import User
from nextgisweb.resource import Resource

from ..model import WebMap


@list_registry
class WebmapPlugin:
    registry: ClassVar[ListRegistry[type["WebmapPlugin"]]]


@list_registry
class WebmapLayerPlugin:
    registry: ClassVar[ListRegistry[type["WebmapLayerPlugin"]]]
    entry: ClassVar[str]

    @classmethod
    def get_payload(
        cls,
        *,
        webmap: WebMap,
        layer: Resource,
        style: Resource,
        user: User,
    ) -> dict[str, Any] | None:
        raise NotImplementedError
