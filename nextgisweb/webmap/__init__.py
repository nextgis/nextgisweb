# -*- coding: utf-8 -*-
from ..component import Component

from .adapter import WebMapAdapter


@Component.registry.register
class WebMapComponent(Component):
    identity = 'webmap'

    def initialize(self):
        from . import models
        models.initialize(self)

    def initialize_db(self):
        if self.WebMap.filter_by().first() is None:
            # Создаем веб-карту по-умолчанию только в том случае,
            # если нет ни одиной карты.

            self.WebMap(
                display_name=u"Основная веб-карта",
                root_item=self.WebMapItem(item_type='root')
            ).persist()

    def setup_pyramid(self, config):
        from . import views
        views.setup_pyramid(self, config)
