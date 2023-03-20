from .base import WebmapLayerPlugin


@WebmapLayerPlugin.registry.register
class LayerOpacityPlugin(WebmapLayerPlugin):

    @classmethod
    def is_layer_supported(cls, layer, webmap):
        return (
            "ngw-webmap/plugin/LayerOpacity",
            dict()
        )
