from nextgisweb.feature_layer import IFeatureLayer, IFeatureQueryLike
from nextgisweb.jsrealm import jsentry
from nextgisweb.resource import DataScope

from .base import WebmapLayerPlugin


class FeatureLayerPlugin(WebmapLayerPlugin):
    entry = jsentry("@nextgisweb/webmap/plugin/feature-layer")

    @classmethod
    def get_payload(cls, *, layer, user, **kwargs):
        if IFeatureLayer.providedBy(layer):
            return dict(
                readonly=not layer.has_permission(DataScope.write, user),
                likeSearch=IFeatureQueryLike.providedBy(layer.feature_query()),
            )
