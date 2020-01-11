# -*- coding: utf-8 -*-
from __future__ import unicode_literals, print_function, absolute_import
import os
import os.path

from ..lib.config import Option
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

    def initialize(self):
        opt_tcache = self.options.with_prefix('tile_cache')
        self.tile_cache_enabled = opt_tcache['enabled']
        self.tile_cache_track_changes = opt_tcache['track_changes']
        self.tile_cache_seed = opt_tcache['seed']

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

    option_annotations = (
        Option('tile_cache.enabled', bool, default=False),
        Option('tile_cache.track_changes', bool, default=False),
        Option('tile_cache.seed', bool, default=False),
    )
