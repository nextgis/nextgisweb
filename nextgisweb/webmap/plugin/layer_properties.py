from pyramid.threadlocal import get_current_request

from nextgisweb.jsrealm import jsentry
from nextgisweb.resource import ResourceScope

from .base import WebmapLayerPlugin


class LayerPropertiesPlugin(WebmapLayerPlugin):
    entry = jsentry("@nextgisweb/webmap/plugin/layer-properties")

    @classmethod
    def is_layer_supported(cls, layer, webmap):
        request = get_current_request()
        if not webmap.has_permission(ResourceScope.update, request.user):
            return False
        return (cls.entry, dict())
