# -*- coding: utf-8 -*-
from ..component import Component, require

from .models import Base, Layer, SpatialLayerMixin

__all__ = ['LayerComponent', 'Layer', 'SpatialLayerMixin']


@Component.registry.register
class LayerComponent(Component):
    identity = 'layer'
    metadata = Base.metadata

    @require('layer_group', 'security')
    def initialize(self):
        super(LayerComponent, self).initialize()

        security = self.env.security

        security.add_resource('layer', label=u"Слой", parent_required=True)

        security.add_permission('layer', 'data-read', label=u"Чтение данных")
        security.add_permission('layer', 'data-edit', label=u"Изменение данных")

        security.add_permission('layer', 'metadata-view', label=u"Чтение метаданных")
        security.add_permission('layer', 'metadata-edit', label=u"Изменение метаданных")

        security.add_resource_child('layer_group', 'layer')

    @require('layer_group')
    def setup_pyramid(self, config):
        from . import views
        views.setup_pyramid(self, config)
