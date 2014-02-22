# -*- coding: utf-8 -*-
from ..component import Component, require
from .models import Base, PostgisConnection, PostgisLayer

__all__ = ['PostgisConnection', 'PostgisLayer']


@Component.registry.register
class PostgisComponent(Component):
    identity = 'postgis'
    metadata = Base.metadata

    def initialize(self):
        super(PostgisComponent, self).initialize()
        self._engine = dict()

    @require('feature_layer')
    def setup_pyramid(self, config):
        from . import views
        views.setup_pyramid(self, config)
