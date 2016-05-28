# -*- coding: utf-8 -*-
from ..component import Component

from .models import SpatialLayerMixin
from .interface import IBboxLayer

__all__ = ['LayerComponent', 'SpatialLayerMixin']


class LayerComponent(Component):
    identity = 'layer'

    def setup_pyramid(self, config):
        from . import api
        api.setup_pyramid(self, config)
