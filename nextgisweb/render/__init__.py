# -*- coding: utf-8 -*-
from __future__ import unicode_literals, print_function, absolute_import

from ..component import Component


@Component.registry.register
class RenderComponent(Component):
    identity = 'render'

    def setup_pyramid(self, config):
        from . import api
        api.setup_pyramid(self, config)
