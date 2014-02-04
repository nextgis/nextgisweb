# -*- coding: utf-8 -*-
from ..component import Component, require

from .models import Base, LayerGroup

__all__ = ['LayerGroupComponent', 'LayerGroup']


@Component.registry.register
class LayerGroupComponent(Component):
    identity = 'layer_group'
    metadata = Base.metadata

    @require('security')
    def initialize(self):
        super(LayerGroupComponent, self).initialize()

        security = self.env.security

        security.add_resource('layer_group', label=u"Группа слоёв")

        security.add_permission('layer_group', 'create', label=u"Создание")
        security.add_permission('layer_group', 'read', label=u"Чтение")
        security.add_permission('layer_group', 'update', label=u"Изменение")
        security.add_permission('layer_group', 'delete', label=u"Удаление")

        security.add_resource_child('layer_group', 'layer_group')

    @require('security')
    def setup_pyramid(self, config):
        from . import views
        views.setup_pyramid(self, config)
