from nextgisweb.layer import IBboxLayer

from .base import WebmapLayerPlugin


class ZoomToLayerPlugin(WebmapLayerPlugin):
    @classmethod
    def is_layer_supported(cls, layer, webmap):
        if IBboxLayer.providedBy(layer):
            return ("ngw-webmap/plugin/ZoomToLayer", dict())
