# -*- coding: utf-8 -*-
import sqlalchemy as sa

from ..component import Component, require


@Component.registry.register
class PostgisLayerComponent(Component):
    identity = 'postgis_layer'

    def initialize(self):
        self.connection = dict()
        for k, v in self.settings.iteritems():
            if k.startswith('connection.'):
                dummy, name = k.split('.', 2)
                self.connection[name] = sa.create_engine(
                    'postgresql+psycopg2://' + v)

        from . import models
        models.initialize(self)

    @require('feature_layer')
    def setup_pyramid(self, config):
        from . import views
        views.setup_pyramid(self, config)

    def client_settings(self, request):
        return dict(connections=self.connection.keys())

    settings_info = ()