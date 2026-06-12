from nextgisweb.jsrealm import jsentry

from .base import WebmapLayerPlugin


class LayerPropertiesPlugin(WebmapLayerPlugin):
    entry = jsentry("@nextgisweb/webmap/plugin/layer-properties")

    @classmethod
    def is_layer_supported(cls, layer, webmap):
        return (cls.entry, dict())
