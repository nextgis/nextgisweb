# -*- coding: utf-8 -*-
from ..component import Component, require


@Component.registry.register
class WMSClientComponent(Component):
    identity = 'wmsclient'

    def initialize(self):
        from . import models
        models.initialize(self)

    def setup_pyramid(self, config):
        from . import views
        views.setup_pyramid(self, config)

    settings_info = ()