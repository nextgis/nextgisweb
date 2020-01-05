# -*- coding: utf-8 -*-
from __future__ import division, absolute_import, print_function, unicode_literals

from ..component import Component

from .models import Base, RasterStyle

__all__ = ['RasterStyleComponent', 'RasterStyle']


class RasterStyleComponent(Component):
    identity = 'raster_style'
    metadata = Base.metadata
