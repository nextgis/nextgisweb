# -*- coding: utf-8 -*-
from ..component import Component
from .models import WMS_VERSIONS

__all__ = ['WMSClientComponent', ]


@Component.registry.register
class WMSClientComponent(Component):
    identity = 'wmsclient'

    def initialize(self):
        from . import models
        models.initialize(self)

    def setup_pyramid(self, config):
        from . import views
        views.setup_pyramid(self, config)

    def client_settings(self, request):
        return dict(wms_versions=WMS_VERSIONS)

    settings_info = ()
