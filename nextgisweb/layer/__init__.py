from ..env import Component

from .model import SpatialLayerMixin
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
