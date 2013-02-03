# -*- coding: utf-8 -*-
from ..component import Component, require

@Component.registry.register
class LayerGroupComponent(Component):
    identity = 'layer_group'

    @require('security')
    def initialize(self):
        from . import models
        models.initialize(self)

        security = self.env.security

        security.add_resource('layer_group', label=u"Группа слоёв")
        
        security.add_permission('layer_group', 'metadata-view', label=u"Чтение метаданных")
        security.add_permission('layer_group', 'metadata-edit', label=u"Изменение метаданных")

        security.add_resource_child('layer_group', 'layer_group')

    @require('security')
    def setup_pyramid(self, config):
        from . import views
        views.setup_pyramid(self, config)

