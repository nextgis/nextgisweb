# -*- coding: utf-8 -*-
from ..component import Component

from .interface import (
    IRenderableStyle,
    IExtentRenderRequest,
    ITileRenderRequest,
    ILegendableStyle,
)

__all__ = [
    'StyleComponent',
    'IRenderableStyle',
    'IExtentRenderRequest',
    'ITileRenderRequest',
    'ILegendableStyle'
]


@Component.registry.register
class StyleComponent(Component):
    identity = 'style'

    def setup_pyramid(self, config):
        from . import views
        views.setup_pyramid(self, config)
