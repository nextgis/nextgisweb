from typing import ClassVar

from nextgisweb.lib.registry import list_registry


@list_registry
class WebmapPlugin:
    amd_free: ClassVar[bool]


@list_registry
class WebmapLayerPlugin:
    amd_free: ClassVar[bool]
