# -*- coding: utf-8 -*-
from __future__ import division, unicode_literals, print_function, absolute_import

from pyramid import threadlocal

from nextgisweb.resource import DataScope

from ...feature_layer import IFeatureLayer, IFeatureQueryLike
from .base import WebmapLayerPlugin


@WebmapLayerPlugin.registry.register
class FeatureLayerPlugin(WebmapLayerPlugin):

    @classmethod
    def is_layer_supported(cls, layer, webmap):
        if IFeatureLayer.providedBy(layer):
            request = threadlocal.get_current_request()
            return ("ngw-webmap/plugin/FeatureLayer", dict(
                readonly=not layer.has_permission(DataScope.write, request.user),
                likeSearch=IFeatureQueryLike.providedBy(layer.feature_query())
            ))
