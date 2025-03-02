from pyramid.threadlocal import get_current_request

from nextgisweb.feature_layer import IFeatureLayer, IFeatureQueryLike
from nextgisweb.jsrealm import jsentry
from nextgisweb.resource import DataScope

from .base import WebmapLayerPlugin


class FeatureLayerPlugin(WebmapLayerPlugin):
    entry = jsentry("@nextgisweb/webmap/plugin/feature-layer")

    @classmethod
    def is_layer_supported(cls, layer, webmap):
        if IFeatureLayer.providedBy(layer):
            request = get_current_request()
            return (
                cls.entry,
                dict(
                    readonly=not layer.has_permission(DataScope.write, request.user),
                    likeSearch=IFeatureQueryLike.providedBy(layer.feature_query()),
                ),
            )
