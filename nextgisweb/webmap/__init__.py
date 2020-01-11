# -*- coding: utf-8 -*-
from __future__ import unicode_literals

import codecs
import json
from pkg_resources import resource_filename

from ..lib.config import Option
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
        from . import api, view
        api.setup_pyramid(self, config)
        view.setup_pyramid(self, config)

    def client_settings(self, request):
        with codecs.open(self.options['basemaps'], 'rb', 'utf-8') as fp:
            basemaps = json.load(fp)

        return dict(
            basemaps=basemaps,
            bing_apikey=self.options['bing_apikey'],
            identify_radius=self.options['identify_radius'],
            popup_width=self.options['popup_width'],
            popup_height=self.options['popup_height'],
            annotation=self.options['annotation'],
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

    option_annotations = (
        Option(
            'basemaps', default=resource_filename('nextgisweb', 'webmap/basemaps.json'),
            doc="Basemaps description file."),
        Option('bing_apikey', default=None, doc="Bing Maps API key."),
        Option('identify_radius', int, default=3, doc="Identification sensitivity."),
        Option('popup_width', int, default=300, doc="Popup width in pixels."),
        Option('popup_height', int, default=200, doc="Popup height in pixels."),
        Option('annotation', bool, default=False, doc="Turn on / off annotations."),
    )
