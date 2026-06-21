from nextgisweb.jsrealm import jsentry
from nextgisweb.resource import ResourceScope

from .base import WebmapLayerPlugin


class LayerRemovePlugin(WebmapLayerPlugin):
    entry = jsentry("@nextgisweb/webmap/plugin/layer-remove")

    @classmethod
    def get_payload(cls, *, webmap, user, **kwargs):
        if webmap.has_permission(ResourceScope.update, user):
            return dict()
