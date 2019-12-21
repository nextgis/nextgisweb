# -*- coding: utf-8 -*-
from __future__ import absolute_import, print_function, unicode_literals
from ..resource import Widget
from ..env import env

from .interface import IRenderableStyle


class TileCacheWidget(Widget):
    interface = IRenderableStyle
    operation = ('create', 'update')
    amdmod = 'ngw-render/TileCacheWidget'

    def is_applicable(self):
        return env.render.tile_cache_enabled \
            and super(TileCacheWidget, self).is_applicable()
