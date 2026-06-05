from pyramid.threadlocal import get_current_request

from nextgisweb.jsrealm import jsentry
from nextgisweb.resource import ResourceScope

from .base import WebmapLayerPlugin


class StyleResourceEditorPlugin(WebmapLayerPlugin):
    entry = jsentry("@nextgisweb/webmap/plugin/style-resource-editor")

    @classmethod
    def is_layer_supported(cls, *, layer, webmap, style):
        if layer is style:
            return False

        request = get_current_request()
        if not style.has_permission(ResourceScope.update, request.user):
            return False

        return (cls.entry, dict())
