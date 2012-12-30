# -*- coding: utf-8 -*-
from ..component import Component

from .models import Style


@Component.registry.register
class StyleComponent(Component):
    identity = 'style'

    @classmethod
    def setup_routes(cls, config):
        config.add_route('style.new', '/layer/{layer_id}/style/new')
        config.add_route('style.show', '/layer/{layer_id}/style/{id}')
        config.add_route('style.tms', '/style/{id}/tms')

        config.add_route('api.style.item.retrive', '/api/layer/{layer_id}/style/{id}', request_method='GET')
        config.add_route('api.style.item.replace', '/api/layer/{layer_id}/style/{id}', request_method='PUT')
        config.add_route('api.style.collection.create', '/api/layer/{layer_id}/style/', request_method='POST')
