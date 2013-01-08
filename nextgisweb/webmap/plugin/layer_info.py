# -*- coding: utf-8 -*-
from .base import WebmapPlugin


@WebmapPlugin.registry.register
class LayerInfoPlugin(WebmapPlugin):

    @classmethod
    def is_layer_supported(cls, layer, webmap):
        return ("webmap/plugin/LayerInfo", True)
