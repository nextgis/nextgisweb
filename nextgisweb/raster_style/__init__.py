# -*- coding: utf-8 -*-
from ..component import Component, require


@Component.registry.register
class RasterStyleComponent(Component):
    identity = 'raster_style'

    @require('raster_layer')
    def initialize(self):
        Component.initialize(self)

        from . import models
        models.include(self)
