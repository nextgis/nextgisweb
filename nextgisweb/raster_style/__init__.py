# -*- coding: utf-8 -*-
from ..component import Component, require


@Component.registry.register
class RasterStyleComponent(Component):
    identity = 'raster_style'

    @require('style')
    def initialize(self):
        Component.initialize(self)

        from . import models
        models.include(self)

    def setup_pyramid(self, config):
    	from . import views
    	views.setup_pyramid(self, config)
