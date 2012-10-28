# -*- coding: utf-8 -*-
from ..component import Component

from .models import Style
from .views import StyleNewForm


@Component.registry.register
class StyleComponent(object):

    @classmethod
    def setup_routes(cls, config):
        config.add_route('style.show', '/style/{id}')
        config.add_route('style.tms', '/style/{id}/tms')
