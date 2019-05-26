# -*- coding: utf-8 -*-
from ..resource import Widget

from .interface import IRenderableStyle


class TileCacheWidget(Widget):
    interface = IRenderableStyle
    operation = ('create', 'update')
    amdmod = 'ngw-render/TileCacheWidget'