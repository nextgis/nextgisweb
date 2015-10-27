# -*- coding: utf-8 -*-
from ..component import Component
from .model import Base, Connection, Layer, WMS_VERSIONS

__all__ = ['Connection', 'Layer']


class WMSClientComponent(Component):
    identity = 'wmsclient'
    metadata = Base.metadata

    def setup_pyramid(self, config):
        from . import view
        view.setup_pyramid(self, config)

    def client_settings(self, request):
        return dict(wms_versions=WMS_VERSIONS)

    settings_info = ()
