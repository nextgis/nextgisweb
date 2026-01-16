from nextgisweb.jsrealm import jsentry

from .base import WebmapLayerPlugin


class LayerIdentifiablePlugin(WebmapLayerPlugin):
    entry = jsentry("@nextgisweb/webmap/plugin/layer-identifiable")

    @classmethod
    def is_layer_supported(cls, layer, webmap):
        return (cls.entry, dict())
