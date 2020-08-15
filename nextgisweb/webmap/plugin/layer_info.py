# -*- coding: utf-8 -*-
from __future__ import division, unicode_literals, print_function, absolute_import
from .base import WebmapLayerPlugin


@WebmapLayerPlugin.registry.register
class LayerInfoPlugin(WebmapLayerPlugin):

    @classmethod
    def is_layer_supported(cls, layer, webmap):
        return (
            "ngw-webmap/plugin/LayerInfo",
            dict(
                description=layer.description,
            )
        )
