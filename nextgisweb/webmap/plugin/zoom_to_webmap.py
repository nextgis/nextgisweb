from nextgisweb.jsrealm import jsentry

from .base import WebmapLayerPlugin

ENTRY = jsentry("@nextgisweb/webmap/plugin/zoom-to-webmap")


class ZoomToWebmapPlugin(WebmapLayerPlugin):
    amd_free = True

    @classmethod
    def is_layer_supported(cls, layer, webmap):
        return (ENTRY, dict())
