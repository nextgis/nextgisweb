from nextgisweb.jsrealm import jsentry

from .base import WebmapLayerPlugin


class LayerOpacityPlugin(WebmapLayerPlugin):
    entry = jsentry("@nextgisweb/webmap/plugin/layer-opacity")

    @classmethod
    def get_payload(cls, **kwargs):
        return dict()
