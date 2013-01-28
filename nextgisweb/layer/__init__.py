# -*- coding: utf-8 -*-
from ..component import Component, require
from ..security import SecurityProvider

from .. import layer_group

from .models import Layer, SpatialLayerMixin
from . import views

@Component.registry.register
@SecurityProvider.registry.register
class LayerComponent(Component):
    identity = 'layer'

    # Component
    # =================================

    @classmethod
    def initialize_db(cls, dbsession):
        pass

    @classmethod
    def setup_routes(cls, config):
        config.add_route('layer', '/layer/')
        config.add_route('layer.show', '/layer/{id}')
        config.add_route('layer.security', '/layer/{id}/security')

    @require('layer_group')
    def initialize(self):
        super(LayerComponent, self).initialize()

        from . import models
        models.initialize(self)

    @require('layer_group')
    def setup_pyramid(self, config):
        from . import views
        views.setup_pyramid(self, config)


    # SecurityProvider
    # =================================

    @classmethod
    def permission_scopes(cls):
        return (
            ('layer', u"Слой"),
        )

    @classmethod
    def permission_categories(cls):
        return (
            ('layer', u"Слой", ('layer_group', 'layer')),
        )

    @classmethod
    def permission_caterories(cls):
        return (
            ('layer', 'layer'),
            ('layer_group', 'layer'),
        )

    @classmethod
    def permissions(cls):
        return (
            ('layer', 'meta_read', u"Чтение метаданных"),
            ('layer', 'meta_write', u"Изменение метаданных"),
            ('layer', 'data_read', u"Чтение данных"),
            ('layer', 'data_write', u"Изменение данных"),
            ('layer', 'data_export', u"Экспорт данных"),
        )
