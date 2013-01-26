# -*- coding: utf-8 -*-
from ..component import Component

from . import views
from .models import VectorLayer


@Component.registry.register
class VectorLayerComponent(Component):
    identity = 'vector_layer'

    def setup_pyramid(self, config):
        from . import views
        views.setup_pyramid(self, config)
