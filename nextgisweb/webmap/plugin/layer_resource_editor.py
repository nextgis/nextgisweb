from pyramid.threadlocal import get_current_request

from nextgisweb.jsrealm import jsentry
from nextgisweb.resource import ResourceScope

from .base import WebmapLayerPlugin


class LayerResourceEditorPlugin(WebmapLayerPlugin):
    entry = jsentry("@nextgisweb/webmap/plugin/layer-resource-editor")

    @classmethod
    def is_layer_supported(cls, *, layer, webmap, style):
        request = get_current_request()
        if not layer.has_permission(ResourceScope.update, request.user):
            return False

        return (cls.entry, dict(hasStyle=style != layer))
