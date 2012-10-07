# -*- coding: utf-8 -*-
from ..component import Component

from .models import WebMap


@Component.registry.register
class WebMapComponent(object):

    @classmethod
    def setup_routes(cls, config):
        config.add_route('webmap.browse', '/webmap/')
        config.add_route('webmap.show', '/webmap/{id}')
        config.add_route('webmap.display', '/webmap/{id}/display')

    @classmethod
    def initialize_db(cls, dbsession):
        dbsession.add(WebMap(display_name=u"Основная веб-карта"))
