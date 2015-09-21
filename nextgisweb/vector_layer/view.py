# -*- coding: utf-8 -*-
from ..resource import Widget

from .model import VectorLayer


class VectorLayerWidget(Widget):
    resource = VectorLayer
    operation = ('create', )
    amdmod = 'ngw-vector-layer/Widget'
