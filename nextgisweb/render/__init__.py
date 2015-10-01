# -*- coding: utf-8 -*-
from __future__ import unicode_literals, print_function, absolute_import

from ..component import Component

from .interface import (
    IRenderableStyle,
    IExtentRenderRequest,
    ITileRenderRequest,
    ILegendableStyle,
)

__all__ = [
    'RenderComponent',
    'IRenderableStyle',
    'IExtentRenderRequest',
    'ITileRenderRequest',
    'ILegendableStyle'
]


@Component.registry.register
class RenderComponent(Component):
    identity = 'render'

    def setup_pyramid(self, config):
        from . import api
        api.setup_pyramid(self, config)
