# -*- coding: utf-8 -*-
from __future__ import unicode_literals, print_function, absolute_import
import os
import os.path

import plyvel

from ..component import Component

from .interface import (
    IRenderableStyle,
    IExtentRenderRequest,
    ITileRenderRequest,
    ILegendableStyle,
)
from .model import Base

__all__ = [
    'RenderComponent',
    'IRenderableStyle',
    'IExtentRenderRequest',
    'ITileRenderRequest',
    'ILegendableStyle'
]


class RenderComponent(Component):
    identity = 'render'
    metadata = Base.metadata

    def initialize(self):
        self.tile_cache_path = os.path.join(self.env.core.gtsdir(self), 'tile_cache')
        if not os.path.isdir(self.tile_cache_path):
            os.makedirs(self.tile_cache_path)

    def setup_pyramid(self, config):
        from . import api
        api.setup_pyramid(self, config)

    @property
    def tile_cache_storage(self):
        if not hasattr(self, '_tile_cache_storage'):
            self._tile_cache_storage = plyvel.DB(
                self.tile_cache_path, create_if_missing=True)
        return self._tile_cache_storage
