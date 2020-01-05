# -*- coding: utf-8 -*-
from __future__ import division, absolute_import, print_function, unicode_literals

from ..resource import Widget

from .model import RasterLayer


class RasterLayerWidget(Widget):
    resource = RasterLayer
    operation = ('create', 'update')
    amdmod = 'ngw-raster-layer/Widget'
