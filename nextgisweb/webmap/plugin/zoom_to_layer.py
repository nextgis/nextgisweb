from nextgisweb.layer import IBboxLayer

from .base import WebmapLayerPlugin


class ZoomToLayerPlugin(WebmapLayerPlugin):
    amd_free = True

    @classmethod
    def is_layer_supported(cls, layer, webmap):
        if IBboxLayer.providedBy(layer):
            return ("@nextgisweb/webmap/plugin/zoom-to-layer", dict())
