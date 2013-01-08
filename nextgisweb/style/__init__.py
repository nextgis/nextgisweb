# -*- coding: utf-8 -*-
from ..component import Component, require

from .models import Style


@Component.registry.register
class StyleComponent(Component):
    identity = 'style'

    @require('layer')
    def initialize(self):
        super(StyleComponent, self).initialize()

        from . import models
        models.initialize(self)

    @classmethod
    def setup_routes(cls, config):
        # config.add_route('style.new', '/layer/{layer_id}/style/new')
        config.add_route('style.show', '/layer/{layer_id}/style/{id}')
        config.add_route('style.tms', '/style/{id}/tms')

        config.add_route('api.style.item.retrive', '/api/layer/{layer_id}/style/{id}', request_method='GET')
        config.add_route('api.style.item.replace', '/api/layer/{layer_id}/style/{id}', request_method='PUT')
        config.add_route('api.style.collection.create', '/api/layer/{layer_id}/style/', request_method='POST')

    def setup_pyramid(self, config):
    	from . import views
    	views.setup_pyramid(self, config)
