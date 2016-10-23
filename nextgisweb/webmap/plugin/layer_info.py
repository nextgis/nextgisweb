# -*- coding: utf-8 -*-
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
