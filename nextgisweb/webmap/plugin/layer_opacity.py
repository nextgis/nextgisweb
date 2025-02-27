from nextgisweb.jsrealm import jsentry

from .base import WebmapLayerPlugin

ENTRY = jsentry("@nextgisweb/webmap/plugin/layer-opacity")


class LayerOpacityPlugin(WebmapLayerPlugin):
    amd_free = True

    @classmethod
    def is_layer_supported(cls, layer, webmap):
        return (ENTRY, dict())
