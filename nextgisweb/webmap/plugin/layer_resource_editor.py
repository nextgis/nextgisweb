from nextgisweb.jsrealm import jsentry
from nextgisweb.resource import ResourceScope

from .base import WebmapLayerPlugin


class LayerResourceEditorPlugin(WebmapLayerPlugin):
    entry = jsentry("@nextgisweb/webmap/plugin/layer-resource-editor")

    @classmethod
    def get_payload(cls, *, layer, style, user, **kwargs):
        if layer.has_permission(ResourceScope.update, user):
            return dict(hasStyle=style != layer)
