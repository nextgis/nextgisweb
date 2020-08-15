# -*- coding: utf-8 -*-
from __future__ import division, unicode_literals, print_function, absolute_import
from .base import WebmapLayerPlugin

from ...layer import IBboxLayer


@WebmapLayerPlugin.registry.register
class ZoomToLayerPlugin(WebmapLayerPlugin):

    @classmethod
    def is_layer_supported(cls, layer, webmap):
        if IBboxLayer.providedBy(layer):
            return ("ngw-webmap/plugin/ZoomToLayer", dict())
