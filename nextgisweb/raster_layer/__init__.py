# -*- coding: utf-8 -*-
from ..component import Component

from .models import Base, RasterLayer

__all__ = ['RasterLayerComponent', 'RasterLayer']


@Component.registry.register
class RasterLayerComponent(Component):
    identity = 'raster_layer'
    metadata = Base.metadata

    def setup_pyramid(self, config):
        from . import views
        views.setup_pyramid(self, config)
