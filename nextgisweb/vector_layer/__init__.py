# -*- coding: utf-8 -*-
from ..component import Component

from . import views
from .models import VectorLayer


@Component.registry.register
class VectorLayerComponent(Component):
    pass
