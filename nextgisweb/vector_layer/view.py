# -*- coding: utf-8 -*-
from ..object_widget import ObjectWidget
from ..resource import Widget

from .model import VectorLayer


class VectorLayerWidget(Widget):
    resource = VectorLayer
    operation = ('create', )
    amdmod = 'ngw-vector-layer/Widget'


class VectorLayerFeatureWidget(ObjectWidget):
    layer = None

    def populate_obj(self):
        for k in self.obj.fields:
            if k in self.data:
                self.obj.fields[k] = self.data[k]

        self.layer.feature_put(self.obj)

    def widget_module(self):
        return 'vector_layer/FeatureWidget'

    def widget_params(self):
        result = super(VectorLayerFeatureWidget, self).widget_params()

        result['fields'] = [
            dict(keyname=f.keyname, label=f.display_name)
            for f in self.layer.fields
        ]

        if self.obj:
            result['value'] = dict(self.obj.fields)

        return result


def setup_pyramid(comp, config):

    def feature_widget(xlayer):

        class LayerVectorFeatureLayer(VectorLayerFeatureWidget):
            layer = xlayer

        return LayerVectorFeatureLayer

    VectorLayer.feature_widget = feature_widget
