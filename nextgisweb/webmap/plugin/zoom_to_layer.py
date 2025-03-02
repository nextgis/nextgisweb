from nextgisweb.jsrealm import jsentry
from nextgisweb.layer import IBboxLayer

from .base import WebmapLayerPlugin


class ZoomToLayerPlugin(WebmapLayerPlugin):
    entry = jsentry("@nextgisweb/webmap/plugin/zoom-to-layer")

    @classmethod
    def is_layer_supported(cls, layer, webmap):
        if IBboxLayer.providedBy(layer):
            return (cls.entry, dict())
