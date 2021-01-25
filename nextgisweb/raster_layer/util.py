# -*- coding: utf-8 -*-
from __future__ import division, absolute_import, print_function, unicode_literals

from ..i18n import trstring_factory

COMP_ID = 'raster_layer'
_ = trstring_factory(COMP_ID)

PYRAMID_TARGET_SIZE = 512

def calc_overviews_levels(ds, blocksize=PYRAMID_TARGET_SIZE):
    cursize = max(ds.RasterXSize, ds.RasterYSize)
    multiplier = 2
    levels = []

    while cursize > blocksize or len(levels) == 0:
        levels.append(multiplier)
        cursize /= 2
        multiplier *= 2

    return levels
