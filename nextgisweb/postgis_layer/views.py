# -*- coding: utf-8 -*-

from ..object_widget import ObjectWidget


class PostgisLayerObjectWidget(ObjectWidget):

    def is_applicable(self):
        return self.operation in ('create', 'edit')

    def populate_obj(self):
        ObjectWidget.populate_obj(self)

        self.obj.connection = self.data['connection']
        self.obj.schema = self.data['schema']
        self.obj.table = self.data['table']
        self.obj.column_id = self.data['column_id']
        self.obj.column_geom = self.data['column_geom']

        if self.operation == 'create':
            self.obj.geometry_type = self.data['geometry_type']
            self.obj.srs_id = self.data['srs_id']

        if self.operation == 'create' or self.data['field_defs'] == 'update':
            self.obj.setup()

    def widget_params(self):
        result = ObjectWidget.widget_params(self)

        if self.obj:
            result['value'] = dict(
                connection=self.obj.connection,
                schema=self.obj.schema,
                table=self.obj.table,
                column_id=self.obj.column_id,
                column_geom=self.obj.column_geom,
                geometry_type=self.obj.geometry_type,
                srs_id=self.obj.srs_id
            )

        return result

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
