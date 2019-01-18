# -*- coding: utf-8 -*-
from __future__ import unicode_literals

import codecs
import json
from pkg_resources import resource_filename

from ..component import Component, require
from ..auth import User
from ..models import DBSession
from .. import db

from .model import Base, WebMap, WebMapItem
from .adapter import WebMapAdapter
from .util import _


class WebMapComponent(Component):
    identity = 'webmap'
    metadata = Base.metadata

    @require('auth')
    def initialize(self):
        super(WebMapComponent, self).initialize()

        # Default settings
        if 'basemaps' not in self.settings:
            self.settings['basemaps'] = resource_filename(
                'nextgisweb', 'webmap/basemaps.json')

        self.settings['identify_radius'] = int(self.settings.get(
            'identify_radius', 10))
        self.settings['popup_width'] = int(self.settings.get(
            'popup_width', 300))
        self.settings['popup_height'] = int(self.settings.get(
            'popup_height', 200))

    @require('resource', 'auth')
    def initialize_db(self):
        # Create a default web-map if there are none
        # TODO: option to turn this off through settings
        if WebMap.filter_by(parent_id=0).first() is None:
            dispname = self.env.core.localizer().translate(_("Main web map"))
            WebMap(parent_id=0, display_name=dispname,
                   owner_user=User.filter_by(keyname='administrator').one(),
                   root_item=WebMapItem(item_type='root')).persist()

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
            adapters=dict(
                (i.identity, dict(display_name=i.display_name))
                for i in WebMapAdapter.registry
            )
        )

    def query_stat(self):
        query_item_type = DBSession.query(
            WebMapItem.item_type, db.func.count(WebMapItem.id)
        ).group_by(WebMapItem.item_type)
        return dict(item_type=dict(query_item_type.all()))

    settings_info = (
        dict(key='basemaps', desc="Basemaps description file"),
        dict(key='bing_apikey', desc="Bing Maps API key"),
        dict(key='identify_radius', desc="Identification sensitivity (3px)"),
        dict(key='popup_width', desc="Popup width"),
        dict(key='popup_height', desc="Popup height"),
    )
