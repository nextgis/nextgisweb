# -*- coding: utf-8 -*-
from __future__ import division, unicode_literals, print_function, absolute_import

from ...feature_layer import IFeatureLayer, IFeatureQueryLike
from .base import WebmapLayerPlugin


@WebmapLayerPlugin.registry.register
class FeatureLayerPlugin(WebmapLayerPlugin):

    @classmethod
    def is_layer_supported(cls, layer, webmap):
        if IFeatureLayer.providedBy(layer):
            return ("ngw-webmap/plugin/FeatureLayer", dict(
                likeSearch=IFeatureQueryLike.providedBy(layer.feature_query())
            ))
