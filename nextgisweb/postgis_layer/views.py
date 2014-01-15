# -*- coding: utf-8 -*-

from ..object_widget import ObjectWidget


class PostgisLayerObjectWidget(ObjectWidget):

    def is_applicable(self):
        return self.operation == 'create'

    def populate_obj(self):
        ObjectWidget.populate_obj(self)

        self.obj.connection = self.data['connection']
        self.obj.table = self.data['table']
        self.obj.column_id = self.data['column_id']
        self.obj.column_geom = self.data['column_geom']
        self.obj.srs_id = self.data['srs_id']

        self.obj.setup()

    def validate(self):
        result = ObjectWidget.validate(self)
        self.error = []
        return result

    def widget_module(self):
        return 'postgis_layer/Widget'


def setup_pyramid(comp, config):
    PostgisLayer = comp.PostgisLayer

    PostgisLayer.object_widget = (
        (PostgisLayer.identity, PostgisLayerObjectWidget),
        ('feature_layer.fields', comp.env.feature_layer.LayerFieldsWidget),
    )
