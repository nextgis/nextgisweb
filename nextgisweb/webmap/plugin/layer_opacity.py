from .base import WebmapLayerPlugin


class LayerOpacityPlugin(WebmapLayerPlugin):
    @classmethod
    def is_layer_supported(cls, layer, webmap):
        return ("@nextgisweb/webmap/plugin/layer-opacity", dict())
