# -*- coding: utf-8 -*-
from __future__ import unicode_literals, print_function, absolute_import
import os
import os.path

from ..component import Component

from . import command  # NOQA
from .interface import (
    IRenderableStyle,
    IExtentRenderRequest,
    ITileRenderRequest,
    ILegendableStyle,
)
from .model import Base
from .event import (
    on_style_change,
    on_data_change,
)


__all__ = [
    'RenderComponent',
    'IRenderableStyle',
    'IExtentRenderRequest',
    'ITileRenderRequest',
    'ILegendableStyle',
    'on_style_change',
    'on_data_change',
]


class RenderComponent(Component):
    identity = 'render'
    metadata = Base.metadata

    def __init__(self, env, settings):
        super(RenderComponent, self).__init__(env, settings)

        def _sbool(name):
            return settings.get(name, 'false').lower() in ('true', 'yes')

        self.tile_cache_enabled = _sbool('tile_cache.enabled')
        self.tile_cache_track_changes = _sbool('tile_cache.track_changes')
        self.tile_cache_seed = _sbool('tile_cache.seed')

    def initialize(self):
        self.tile_cache_path = os.path.join(self.env.core.gtsdir(self), 'tile_cache')
        if not os.path.isdir(self.tile_cache_path):
            os.makedirs(self.tile_cache_path)

    def setup_pyramid(self, config):
        from . import api, view # NOQA
        api.setup_pyramid(self, config)

    def client_settings(self, request):
        return dict(tile_cache=dict(
            enabled=self.tile_cache_enabled,
            track_changes=self.tile_cache_track_changes,
            seed=self.tile_cache_seed
        ))

    def backup_configure(self, config):
        super(RenderComponent, self).backup_configure(config)
        config.exclude_table_data('tile_cache', '*')
