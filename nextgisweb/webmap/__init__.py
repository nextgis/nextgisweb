# -*- coding: utf-8 -*-
from ..component import Component

from .models import WebMap, WebMapItem


@Component.registry.register
class WebMapComponent(object):

    @classmethod
    def setup_routes(cls, config):
        config.add_route('webmap.browse', '/webmap/')
        config.add_route('webmap.show', '/webmap/{id}')
        config.add_route('webmap.display', '/webmap/{id}/display')
        config.add_route('webmap.layer_hierarchy', '/webmap/{id}/layer_hierarchy')

        config.add_route('api.webmap.item.retrive', '/api/webmap/{id}', request_method='GET')
        config.add_route('api.webmap.item.replace', '/api/webmap/{id}', request_method='PUT')

    @classmethod
    def initialize_db(cls, dbsession):
        root_item = WebMapItem(item_type='root')
        webmap = WebMap(display_name=u"Основная веб-карта", root_item=root_item)
        dbsession.add(webmap)
