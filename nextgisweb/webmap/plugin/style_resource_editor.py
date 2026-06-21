from nextgisweb.jsrealm import jsentry
from nextgisweb.resource import ResourceScope

from .base import WebmapLayerPlugin


class StyleResourceEditorPlugin(WebmapLayerPlugin):
    entry = jsentry("@nextgisweb/webmap/plugin/style-resource-editor")

    @classmethod
    def get_payload(cls, *, layer, style, user, **kwargs):
        if layer is not style and style.has_permission(ResourceScope.update, user):
            return dict()
