# -*- coding: utf-8 -*-
from ..component import Component

from .models import SpatialLayerMixin

__all__ = ['LayerComponent', 'SpatialLayerMixin']


@Component.registry.register
class LayerComponent(Component):
    identity = 'layer'
