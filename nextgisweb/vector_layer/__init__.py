# -*- coding: utf-8 -*-
from ..component import Component, require


@Component.registry.register
class VectorLayerComponent(Component):
    identity = 'vector_layer'

    def initialize(self):
        from . import models
        models.initialize(self)

    @require('feature_layer')
    def setup_pyramid(self, config):
        from . import views
        views.setup_pyramid(self, config)
