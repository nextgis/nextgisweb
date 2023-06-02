import json
from pkg_resources import resource_filename
from pathlib import Path

from ..lib.config import Option
from ..env import Component, require
from ..auth import User
from ..env.model import DBSession
from ..lib import db

from .model import Base, WebMap, WebMapItem
from .adapter import WebMapAdapter
from .util import _


class WebMapComponent(Component):
    identity = 'webmap'
    metadata = Base.metadata

    def initialize(self):
        super().initialize()
        basemaps_path = Path(self.options['basemaps'])
        self.basemaps = json.loads(basemaps_path.read_text())

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
        result = dict(
            basemaps=self.basemaps,
            annotation=self.options['annotation'],
            adapters=dict(
                (i.identity, dict(
                    display_name=request.localizer.translate(i.display_name)))
                for i in WebMapAdapter.registry
            ),
            enable_social_networks=self.options['enable_social_networks'],
            check_origin=self.options['check_origin'],
        )

        settings_view = self.settings_view(request)
        result.update(settings_view)

        if 'legend_visible' in settings_view and settings_view['legend_visible'] == 'default':
            result['legend_visible'] = 'on' if self.options['legend_visible'] else 'disabled'

        return result

    def query_stat(self):
        query_item_type = DBSession.query(
            WebMapItem.item_type, db.func.count(WebMapItem.id)
        ).group_by(WebMapItem.item_type)
        return dict(item_type=dict(query_item_type.all()))

    option_annotations = (
        Option(
            'basemaps', default=resource_filename('nextgisweb', 'webmap/basemaps.json'),
            doc="Basemaps description file."),
        Option('annotation', bool, default=True, doc="Turn on / off annotations."),
        Option('enable_social_networks', bool, default=False),
        Option('check_origin', bool, default=False, doc="Check iframe Referer header."),
        Option('legend_visible', str, default='off'),
    )
