from nextgisweb.feature_layer import FeatureLayerMixin
from nextgisweb.jsrealm import jsentry
from nextgisweb.raster_layer import RasterLayer

from .base import WebmapLayerPlugin


class LayerExportPlugin(WebmapLayerPlugin):
    entry = jsentry("@nextgisweb/webmap/plugin/layer-export")

    @classmethod
    def get_payload(cls, *, layer, user, **kwargs):
        if (
            isinstance(layer, FeatureLayerMixin) or isinstance(layer, RasterLayer)
        ) and layer.has_export_permission(user):
            return dict()
