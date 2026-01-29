from nextgisweb.jsrealm import jsentry

from .base import WebmapLayerPlugin


class LayerFilterPlugin(WebmapLayerPlugin):
    entry = jsentry("@nextgisweb/webmap/plugin/layer-filter")

    @classmethod
    def is_layer_supported(cls, layer, webmap):
        return (cls.entry, dict())
