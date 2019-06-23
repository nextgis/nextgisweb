# -*- coding: utf-8 -*-
from __future__ import absolute_import, print_function, unicode_literals
from ..resource import Widget

from .interface import IRenderableStyle


class TileCacheWidget(Widget):
    interface = IRenderableStyle
    operation = ('create', 'update')
    amdmod = 'ngw-render/TileCacheWidget'
