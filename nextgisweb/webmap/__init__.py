# -*- coding: utf-8 -*-
from ..component import Component, require

from .adapter import WebMapAdapter


@Component.registry.register
class WebMapComponent(Component):
    identity = 'webmap'

    @require('security')
    def initialize(self):
        security = self.env.security

        security.add_resource('webmap', label=u"Веб-карта")
        security.add_permission('webmap', 'read', label=u"Чтение")
        security.add_permission('webmap', 'write', label=u"Запись")

        from . import models
        models.initialize(self)

    @require('security', 'auth')
    def initialize_db(self):
        auth = self.env.auth

        if self.WebMap.filter_by().first() is None:
            # Создаем веб-карту по-умолчанию только в том случае,
            # если нет ни одиной карты.

            admin = auth.User.filter_by(keyname='administrator').one()

            self.WebMap(
                owner_user=admin,
                display_name=u"Основная веб-карта",
                root_item=self.WebMapItem(item_type='root')
            ).persist()

    def setup_pyramid(self, config):
        from . import views
        views.setup_pyramid(self, config)
