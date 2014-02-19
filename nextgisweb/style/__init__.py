# -*- coding: utf-8 -*-
from ..component import Component, require

from .interface import (
    IRenderableStyle,
    IExtentRenderRequest,
    ITileRenderRequest,
)

__all__ = [
    'StyleComponent',
    'IRenderableStyle',
    'IExtentRenderRequest',
    'ITileRenderRequest'
]


@Component.registry.register
class StyleComponent(Component):
    identity = 'style'

    @require('layer', 'security')
    def initialize(self):
        super(StyleComponent, self).initialize()

        security = self.env.security
        security.add_permission('layer', 'style-read', label=u"Чтение стилей")
        security.add_permission('layer', 'style-write', label=u"Изменение стилей")

    def setup_pyramid(self, config):
        from . import views
        views.setup_pyramid(self, config)
