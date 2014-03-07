# -*- coding: utf-8 -*-
import codecs
import json
from pkg_resources import resource_filename

from ..component import Component, require
from ..auth import User

from .model import Base, WebMap, WebMapItem
from .adapter import WebMapAdapter

__all__ = ['WebMapComponent', 'WebMap', 'WebMapItem']


@Component.registry.register
class WebMapComponent(Component):
    identity = 'webmap'
    metadata = Base.metadata

    @require('security')
    def initialize(self):
        super(WebMapComponent, self).initialize()

        # Настройки по умолчанию
        if 'basemaps' not in self.settings:
            self.settings['basemaps'] = resource_filename(
                'nextgisweb', 'webmap/basemaps.json')

        self.settings['identify_radius'] = int(self.settings.get(
            'identify_radius', 3))
        self.settings['popup_width'] = int(self.settings.get(
            'popup_width', 300))
        self.settings['popup_height'] = int(self.settings.get(
            'popup_height', 200))

        security = self.env.security

        security.add_resource('webmap', label=u"Веб-карта")
        security.add_permission('webmap', 'read', label=u"Чтение")
        security.add_permission('webmap', 'write', label=u"Запись")

    @require('security', 'auth')
    def initialize_db(self):
        if WebMap.filter_by().first() is None:
            # Создаем веб-карту по-умолчанию только в том случае,
            # если нет ни одиной карты.

            admin = User.filter_by(keyname='administrator').one()

            WebMap(
                owner_user=admin,
                display_name=u"Основная веб-карта",
                root_item=WebMapItem(item_type='root')
            ).persist()

    def setup_pyramid(self, config):
        from . import view
        view.setup_pyramid(self, config)

    def client_settings(self, request):
        with codecs.open(self.settings['basemaps'], 'rb', 'utf-8') as fp:
            basemaps = json.load(fp)

        return dict(
            basemaps=basemaps,
            bing_apikey=self.settings.get('bing_apikey'),
            identify_radius=self.settings.get('identify_radius'),
            popup_width=self.settings.get('popup_width'),
            popup_height=self.settings.get('popup_height'),
            adapters=dict([
                (i.identity, dict(display_name=i.display_name))
                for i in WebMapAdapter.registry
            ])
        )

    settings_info = (
        dict(key='basemaps', desc=u"Файл с описанием базовых слоёв"),
        dict(key='bing_apikey', desc=u"Bing Maps API-ключ"),
        dict(key='identify_radius', desc=u"Чувствительность инструмента идентификации (px)"),
        dict(key='popup_width', desc=u"Ширина всплывающего окна (px)"),
        dict(key='popup_height', desc=u"Высота всплывающего окна (px)"),
    )
