# -*- coding: utf-8 -*-
from ..component import Component

from .models import WebMap, WebMapItem
from .adapter import WebMapAdapter

@Component.registry.register
class WebMapComponent(Component):
    identity = 'webmap'

    @classmethod
    def setup_routes(cls, config):
        config.add_route('webmap.browse', '/webmap/')
        config.add_route('webmap.display', '/webmap/{id}/display')
        config.add_route('webmap.layer_hierarchy', '/webmap/{id}/layer_hierarchy')

        config.add_route('api.webmap.item.retrive', '/api/webmap/{id}', request_method='GET')
        config.add_route('api.webmap.item.replace', '/api/webmap/{id}', request_method='PUT')

    def initialize(self):
        from . import models
        models.initialize(self)

    def setup_pyramid(self, config):
        from . import views
        views.setup_pyramid(self, config)

    @classmethod
    def initialize_db(cls, dbsession):
        root_item = WebMapItem(item_type='root')
        webmap = WebMap(display_name=u"Основная веб-карта", root_item=root_item)
        dbsession.add(webmap)
