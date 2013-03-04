# -*- coding: utf-8 -*-
import codecs
import json
from pkg_resources import resource_filename

from ..component import Component, require
from .adapter import WebMapAdapter


@Component.registry.register
class WebMapComponent(Component):
    identity = 'webmap'

    @require('security')
    def initialize(self):
        # Настройки по умолчанию
        if 'basemaps' not in self.settings:
            self.settings['basemaps'] = resource_filename(
                'nextgisweb', 'webmap/basemaps.json')

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

    def client_settings(self, request):
        with codecs.open(self.settings['basemaps'], 'rb', 'utf-8') as fp:
            basemaps = json.load(fp)

        return dict(
            basemaps=basemaps,
            bing_apikey=self.settings.get('bing_apikey'),
        )

    settings_info = (
        dict(key='bing_apikey', desc=u"Bing maps API key"),
    )
