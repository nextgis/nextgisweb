from nextgisweb.feature_layer import FeatureLayerMixin, IWritableFeatureLayer
from nextgisweb.jsrealm import jsentry
from nextgisweb.resource import DataScope

from .base import WebmapLayerPlugin


class LayerEditorPlugin(WebmapLayerPlugin):
    entry = jsentry("@nextgisweb/webmap/plugin/layer-editor")

    @classmethod
    def get_payload(cls, *, layer, user, **kwargs):
        if isinstance(layer, FeatureLayerMixin) and layer.has_permission(DataScope.write, user):
            return dict(
                writable=IWritableFeatureLayer.providedBy(layer),
                geometry_type=layer.geometry_type,
            )
