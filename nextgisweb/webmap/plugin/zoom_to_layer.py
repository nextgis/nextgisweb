from .base import WebmapLayerPlugin

from ...layer import IBboxLayer


class ZoomToLayerPlugin(WebmapLayerPlugin):

    @classmethod
    def is_layer_supported(cls, layer, webmap):
        if IBboxLayer.providedBy(layer):
            return ("ngw-webmap/plugin/ZoomToLayer", dict())
