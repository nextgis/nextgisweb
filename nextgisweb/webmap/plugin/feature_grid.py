# -*- coding: utf-8 -*-
from .base import WebmapPlugin

from ...feature_layer import IFeatureLayer


@WebmapPlugin.registry.register
class FeatureGridPlugin(WebmapPlugin):

    @classmethod
    def is_layer_supported(cls, layer, webmap):
        if IFeatureLayer.providedBy(layer):
            return ("webmap/plugin/FeatureGrid", dict(
                layer_id=layer.id,
                columns=[
                    dict(field="id", label="#"),
                ] + [
                    dict(field=f.keyname)
                    for f in layer.fields
                ]
            ))
