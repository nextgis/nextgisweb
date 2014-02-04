# -*- coding: utf-8 -*-
import sqlalchemy as sa

from ..component import Component, require
from .models import Base, PostgisLayer

__all__ = ['PostgisLayerComponent', 'PostgisLayer']


@Component.registry.register
class PostgisLayerComponent(Component):
    identity = 'postgis_layer'
    metadata = Base.metadata

    def initialize(self):
        super(PostgisLayerComponent, self).initialize()

        self.connection = dict()
        for k, v in self.settings.iteritems():
            if k.startswith('connection.'):
                dummy, name = k.split('.', 2)
                self.connection[name] = sa.create_engine(
                    'postgresql+psycopg2://' + v)

    @require('feature_layer')
    def setup_pyramid(self, config):
        from . import views
        views.setup_pyramid(self, config)

    def client_settings(self, request):
        return dict(connections=self.connection.keys())

    settings_info = ()
