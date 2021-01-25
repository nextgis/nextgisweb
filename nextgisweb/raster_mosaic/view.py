# -*- coding: utf-8 -*-
from __future__ import division, unicode_literals, print_function, absolute_import

from .model import RasterMosaic
from ..resource import Widget


class ItemWidget(Widget):
    resource = RasterMosaic
    operation = ('create', 'update')
    amdmod = 'ngw-raster-mosaic/ItemWidget'


class RasterMosaicWidget(Widget):
    resource = RasterMosaic
    operation = ('create', 'update')
    amdmod = 'ngw-raster-mosaic/Widget'
