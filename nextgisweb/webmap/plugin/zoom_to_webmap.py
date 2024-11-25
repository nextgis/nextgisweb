from .base import WebmapLayerPlugin


class ZoomToWebmapPlugin(WebmapLayerPlugin):
    @classmethod
    def is_layer_supported(cls, layer, webmap):
        return ("@nextgisweb/webmap/plugin/zoom-to-webmap", dict())
