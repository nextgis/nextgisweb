from pyramid import threadlocal

from nextgisweb.feature_layer import IFeatureLayer, IWritableFeatureLayer
from nextgisweb.feature_layer.view import PD_WRITE

from .base import WebmapLayerPlugin


class LayerEditorPlugin(WebmapLayerPlugin):
    @classmethod
    def is_layer_supported(cls, layer, webmap):
        if IFeatureLayer.providedBy(layer):
            request = threadlocal.get_current_request()
            write_permission = layer.has_permission(PD_WRITE, request.user)
            if not write_permission:
                return False
            return (
                "ngw-webmap/plugin/LayerEditor",
                dict(
                    writable=IWritableFeatureLayer.providedBy(layer),
                    geometry_type=layer.geometry_type,
                ),
            )
