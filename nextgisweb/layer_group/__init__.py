# -*- coding: utf-8 -*-
from ..component import Component
from ..security import SecurityProvider

from .models import LayerGroup
from . import views


@Component.registry.register
@SecurityProvider.registry.register
class LayerGroupComponent(Component):
    identity = 'layer_group'

    # Component
    # =================================

    @classmethod
    def setup_routes(cls, config):
        config.add_route('layer_group', '/layer_group/')

        config.add_route('layer_group.show', '/layer_group/{id}')
        config.add_route('layer_group.edit_security', '/layer_group/{id}/edit-security')
        config.add_route('layer_group.show_security', '/layer_group/{id}/show-security')

        config.add_route('layer_group.new_group', '/layer_group/{id}/group/new')
        config.add_route('layer_group.delete', '/layer_group/{id}/delete')

        config.add_route('api.layer_group.tree', '/api/layer_group/{id}/tree')

    # SecurityProvider
    # =================================

    @classmethod
    def permission_scopes(cls):
        return (
            ('layer_group', u"Группа слоёв"),
        )

    @classmethod
    def permission_categories(cls):
        return (
            ('layer_group', u"Группа слоёв", ('layer_group', )),
        )

    @classmethod
    def permissions(cls):
        return (
            ('layer_group', 'read', u"Чтение"),
            ('layer_group', 'group-add', u"Добавлять группы"),
            ('layer_group', 'layer-add', u"Добавлять слои"),
            ('layer_group', 'security', u"Управление доступом")
        )
