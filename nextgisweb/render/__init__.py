# -*- coding: utf-8 -*-
from __future__ import division, unicode_literals, print_function, absolute_import
import os
import os.path
from datetime import datetime

from ..lib.config import Option
from ..component import Component, require
from ..core import KindOfData
from ..models import DBSession

from . import command  # NOQA
from .interface import (
    IRenderableStyle,
    IExtentRenderRequest,
    ITileRenderRequest,
    ILegendableStyle,
)
from .model import Base, ResourceTileCache, TIMESTAMP_EPOCH
from .event import (
    on_style_change,
    on_data_change,
)
from .util import _


__all__ = [
    'RenderComponent',
    'IRenderableStyle',
    'IExtentRenderRequest',
    'ITileRenderRequest',
    'ILegendableStyle',
    'on_style_change',
    'on_data_change',
]


class TileCacheData(KindOfData):
    identity = 'tile_cache'
    display_name = _("Tile cache")


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

    @require('resource')
    def setup_pyramid(self, config):
        from . import api, view # NOQA
        api.setup_pyramid(self, config)
        view.setup_pyramid(self, config)

    def client_settings(self, request):
        return dict(tile_cache=dict(
            enabled=self.tile_cache_enabled,
            track_changes=self.tile_cache_track_changes,
            seed=self.tile_cache_seed
        ))

    def backup_configure(self, config):
        super(RenderComponent, self).backup_configure(config)
        config.exclude_table_data('tile_cache', '*')

    def estimate_storage(self):
        for tc in ResourceTileCache.filter_by(enabled=True).all():
            if tc.ttl is not None:
                now_unix = int((datetime.utcnow() - TIMESTAMP_EPOCH).total_seconds())
                where_sql = ' WHERE tstamp > %d' % (now_unix - tc.ttl)
            else:
                where_sql = None

            tilestor, lock = tc.get_tilestor()
            query_tile = 'SELECT coalesce(sum(length(data) + 16), 0) FROM tile'  # with 4x int columns
            if where_sql is not None:
                query_tile += where_sql
            size_img = tilestor.execute(query_tile).fetchone()[0]

            query = 'SELECT count(1) FROM tile_cache."{}"'.format(tc.uuid.hex)
            if where_sql is not None:
                query += where_sql
            count = DBSession.execute(query).scalar()
            size_color = count * 20  # 5x int columns

            yield TileCacheData, tc.resource_id, size_img + size_color

    option_annotations = (
        Option('tile_cache.enabled', bool, default=True),
        Option('tile_cache.track_changes', bool, default=False),
        Option('tile_cache.seed', bool, default=False),
    )
