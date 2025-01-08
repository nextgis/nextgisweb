from .base import WebmapLayerPlugin


class LayerOpacityPlugin(WebmapLayerPlugin):
    amd_free = True

    @classmethod
    def is_layer_supported(cls, layer, webmap):
        return ("@nextgisweb/webmap/plugin/layer-opacity", dict())
