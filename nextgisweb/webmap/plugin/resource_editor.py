from pyramid.threadlocal import get_current_request

from nextgisweb.feature_layer import IFeatureLayer
from nextgisweb.jsrealm import jsentry
from nextgisweb.resource import ResourceScope

from .base import WebmapLayerPlugin


class ResourceEditorPlugin(WebmapLayerPlugin):
    entry = jsentry("@nextgisweb/webmap/plugin/resource-editor")

    @classmethod
    def is_layer_supported(cls, layer, webmap):
        if IFeatureLayer.providedBy(layer):
            request = get_current_request()
            write_permission = layer.has_permission(ResourceScope.update, request.user)
            if not write_permission:
                return False
            return (
                cls.entry,
                dict(),
            )
