from nextgisweb.jsrealm import jsentry

from .base import WebmapLayerPlugin


class LayerPhotoPlugin(WebmapLayerPlugin):
    entry = jsentry("@nextgisweb/webmap/plugin/layer-photo")

    @classmethod
    def get_payload(cls, **kwargs):
        return dict()
