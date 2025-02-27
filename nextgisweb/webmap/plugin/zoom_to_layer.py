from nextgisweb.jsrealm import jsentry
from nextgisweb.layer import IBboxLayer

from .base import WebmapLayerPlugin

ENTRY = jsentry("@nextgisweb/webmap/plugin/zoom-to-layer")


class ZoomToLayerPlugin(WebmapLayerPlugin):
    amd_free = True

    @classmethod
    def is_layer_supported(cls, layer, webmap):
        if IBboxLayer.providedBy(layer):
            return (ENTRY, dict())
