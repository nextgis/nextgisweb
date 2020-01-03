# -*- coding: utf-8 -*-
from __future__ import division, absolute_import, print_function, unicode_literals

from ..registry import registry_maker


class FeatureExtension(object):
    registry = registry_maker()

    def __init__(self, layer):
        self._layer = layer

    @property
    def layer(self):
        return self._layer
