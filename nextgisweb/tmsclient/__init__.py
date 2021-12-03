from datetime import timedelta

from ..component import Component, require
from ..lib.config import Option
from .model import Base, Connection, Layer, SCHEME

__all__ = ['Connection', 'Layer']


class TMSClientComponent(Component):
    identity = 'tmsclient'
    metadata = Base.metadata

    def initialize(self):
        super().initialize()

        self.headers = {
            'User-Agent': self.options['user_agent']
        }

    def client_settings(self, request):
        return dict(schemes=SCHEME.enum)

    @require('render', 'layer')
    def setup_pyramid(self, config):
        from . import api, view
        api.setup_pyramid(self, config)
        view.setup_pyramid(self, config)

    option_annotations = (
        Option('nextgis_geoservices.layers', default='https://geoservices.nextgis.com/config/maps'),  # NOQA: E501
        Option('nextgis_geoservices.url_template', default='https://geoservices.nextgis.com/raster/{layer}/{z}/{x}/{y}.png'),  # NOQA: E501
        Option('user_agent', default="NextGIS Web"),
        Option('timeout', timedelta, default=timedelta(seconds=15)),
    )
