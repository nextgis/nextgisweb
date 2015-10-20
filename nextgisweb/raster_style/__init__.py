# -*- coding: utf-8 -*-
from ..component import Component

from .models import Base, RasterStyle

__all__ = ['RasterStyleComponent', 'RasterStyle']


class RasterStyleComponent(Component):
    identity = 'raster_style'
    metadata = Base.metadata
