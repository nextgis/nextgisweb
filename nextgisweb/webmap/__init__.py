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
        config.add_route('webmap.display', '/webmap/{id:\d+}/display')
        config.add_route('webmap.layer_hierarchy', '/webmap/{id:\d+}/layer_hierarchy')

    def initialize(self):
        from . import models
        models.initialize(self)

    def initialize_db(self):
        DBSession = self.env.core.DBSession

        root_item = WebMapItem(item_type='root')
        webmap = WebMap(display_name=u"Основная веб-карта", root_item=root_item)
        DBSession.add(webmap)


    def setup_pyramid(self, config):
        from . import views
        views.setup_pyramid(self, config)

