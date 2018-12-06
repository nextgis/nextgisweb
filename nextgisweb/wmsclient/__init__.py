# -*- coding: utf-8 -*-
from ..component import Component
from .model import Base, Connection, Layer, WMS_VERSIONS

__all__ = ['Connection', 'Layer']


class WMSClientComponent(Component):
    identity = 'wmsclient'
    metadata = Base.metadata

    def initialize(self):
        super(WMSClientComponent, self).initialize()

        self.headers = {
            'User-Agent': self.settings.get('user_agent', 'NextGIS Web')
        }

    def setup_pyramid(self, config):
        from . import view
        view.setup_pyramid(self, config)

    def client_settings(self, request):
        return dict(wms_versions=WMS_VERSIONS)

    settings_info = (
        dict(key='user_agent', desc=u"HTTP-header User-Agent"),
    )
