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

        security = self.env.security
        security.add_permission('layer', 'style-read', label=u"Чтение стилей")
        security.add_permission('layer', 'style-write', label=u"Изменение стилей")

    def setup_pyramid(self, config):
        from . import views
        views.setup_pyramid(self, config)
