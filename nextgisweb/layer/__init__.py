# -*- coding: utf-8 -*-
from __future__ import division, unicode_literals, print_function, absolute_import

from ..component import Component

from .models import SpatialLayerMixin
from .interface import IBboxLayer

__all__ = [
    'LayerComponent',
    'SpatialLayerMixin',
    'IBboxLayer',
]


class LayerComponent(Component):
    identity = 'layer'

    def setup_pyramid(self, config):
        from . import api
        api.setup_pyramid(self, config)
