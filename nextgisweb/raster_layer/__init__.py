# -*- coding: utf-8 -*-
from ..component import Component

from .model import Base, RasterLayer

__all__ = ['RasterLayerComponent', 'RasterLayer']


class RasterLayerComponent(Component):
    identity = 'raster_layer'
    metadata = Base.metadata

    def setup_pyramid(self, config):
        from . import view # NOQA
