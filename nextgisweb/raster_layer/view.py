# -*- coding: utf-8 -*-
from ..resource import Widget

from .model import RasterLayer


class RasterLayerWidget(Widget):
    resource = RasterLayer
    operation = ('create', )
    amdmod = 'ngw-raster-layer/Widget'
