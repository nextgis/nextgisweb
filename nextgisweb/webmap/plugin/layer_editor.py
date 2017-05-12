# -*- coding: utf-8 -*-
from .base import WebmapLayerPlugin

from ...feature_layer import IFeatureLayer, IWritableFeatureLayer


@WebmapLayerPlugin.registry.register
class LayerEditorPlugin(WebmapLayerPlugin):

    @classmethod
    def is_layer_supported(cls, layer, webmap):
        if IFeatureLayer.providedBy(layer):
            return ("ngw-webmap/plugin/LayerEditor", dict(
                writable=IWritableFeatureLayer.providedBy(layer),
                geometry_type=layer.geometry_type
            ))
