# -*- coding: utf-8 -*-
from .base import WebmapLayerPlugin

from ...feature_layer import IFeatureLayer, IFeatureQueryLike


@WebmapLayerPlugin.registry.register
class FeatureLayerPlugin(WebmapLayerPlugin):

    @classmethod
    def is_layer_supported(cls, layer, webmap):
        if IFeatureLayer.providedBy(layer):
            return ("ngw-webmap/plugin/FeatureLayer", dict(
                likeSearch=IFeatureQueryLike.providedBy(layer.feature_query())
            ))
