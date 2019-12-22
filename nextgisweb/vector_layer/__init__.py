# -*- coding: utf-8 -*-
from __future__ import division, absolute_import, print_function, unicode_literals

from ..component import Component, require

from .model import Base, VectorLayer

__all__ = [
    'VectorLayerComponent',
    'VectorLayer',
]


class VectorLayerComponent(Component):
    identity = 'vector_layer'
    metadata = Base.metadata

    @require('feature_layer')
    def setup_pyramid(self, config):
        from . import view  # NOQA: F401
