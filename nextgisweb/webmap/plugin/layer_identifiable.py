from nextgisweb.jsrealm import jsentry

from .base import WebmapLayerPlugin


class LayerIdentifiablePlugin(WebmapLayerPlugin):
    entry = jsentry("@nextgisweb/webmap/plugin/layer-identifiable")

    @classmethod
    def get_payload(cls, **kwargs):
        return dict()
