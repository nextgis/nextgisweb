# -*- coding: utf-8 -*-
from ..component import Component, require


@Component.registry.register
class StyleComponent(Component):
    identity = 'style'

    @require('layer', 'security')
    def initialize(self):
        super(StyleComponent, self).initialize()

        from . import models
        models.initialize(self)

    def setup_pyramid(self, config):
    	from . import views
    	views.setup_pyramid(self, config)
