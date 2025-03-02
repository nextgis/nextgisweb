from nextgisweb.jsrealm import jsentry

from .base import WebmapLayerPlugin


class ZoomToWebmapPlugin(WebmapLayerPlugin):
    entry = jsentry("@nextgisweb/webmap/plugin/zoom-to-webmap")

    @classmethod
    def is_layer_supported(cls, layer, webmap):
        return (cls.entry, dict())
