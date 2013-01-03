# -*- coding: utf-8 -*-
from ..component import Component, require


@Component.registry.register
class RasterLayerComponent(Component):
    identity = 'raster_layer'

    @require('layer', 'file_storage')
    def initialize(self):
        Component.initialize(self)

        from . import models, views

        models.include(self)
        views.include(self)
