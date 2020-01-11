# -*- coding: utf-8 -*-
from ..lib.config import Option
from ..component import Component
from .model import Base, Connection, Layer, WMS_VERSIONS

__all__ = ['Connection', 'Layer']


class WMSClientComponent(Component):
    identity = 'wmsclient'
    metadata = Base.metadata

    def initialize(self):
        super(WMSClientComponent, self).initialize()

        self.headers = {
            'User-Agent': self.options['user_agent']
        }

    def setup_pyramid(self, config):
        from . import view
        view.setup_pyramid(self, config)

    def client_settings(self, request):
        return dict(wms_versions=WMS_VERSIONS)

    option_annotations = (
        Option('user_agent', default="NextGIS Web"),
    )
