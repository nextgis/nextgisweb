from nextgisweb.jsrealm import jsentry
from nextgisweb.layer import IBboxLayer

from .base import WebmapLayerPlugin


class ZoomToLayerPlugin(WebmapLayerPlugin):
    entry = jsentry("@nextgisweb/webmap/plugin/zoom-to-layer")

    @classmethod
    def get_payload(cls, *, layer, **kwargs):
        if IBboxLayer.providedBy(layer):
            return dict()
