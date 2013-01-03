# -*- coding: utf-8 -*-
from ..component import Component


@Component.registry.register
class RasterStyleComponent(Component):
    identity = 'raster_style'

    def initialize(self):
        Component.initialize(self)

        from . import models
        models.include(self)
