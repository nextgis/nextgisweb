
# -*- coding: utf-8 -*-
from __future__ import division, absolute_import, print_function, unicode_literals

from ..core import KindOfData

from .util import _


class RasterLayerData(KindOfData):
    identity = 'raster_layer'
    display_name = _("Rasters and pyramids")
