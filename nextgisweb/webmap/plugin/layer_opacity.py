from nextgisweb.jsrealm import jsentry

from .base import WebmapLayerPlugin


class LayerOpacityPlugin(WebmapLayerPlugin):
    entry = jsentry("@nextgisweb/webmap/plugin/layer-opacity")

    @classmethod
    def is_layer_supported(cls, layer, webmap):
        return (cls.entry, dict())
