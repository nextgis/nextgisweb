# -*- coding: utf-8 -*-
from __future__ import division, absolute_import, print_function, unicode_literals
from ..resource import Widget

from .model import VectorLayer


class VectorLayerWidget(Widget):
    resource = VectorLayer
    operation = ('create', )
    amdmod = 'ngw-vector-layer/Widget'
