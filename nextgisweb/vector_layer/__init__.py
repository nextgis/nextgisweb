# -*- coding: utf-8 -*-
from __future__ import division, absolute_import, print_function, unicode_literals

from ..component import Component, require
from ..lib.config import Option

from . import command  # NOQA
from .kind_of_data import VectorLayerData
from .model import Base, VectorLayer, estimate_vector_layer_data

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

    def client_settings(self, request):
        return dict(show_create_mode=self.options['show_create_mode'])

    def estimate_storage(self):
        for resource in VectorLayer.query():
            size = estimate_vector_layer_data(resource)
            yield VectorLayerData, resource.id, size

    option_annotations = (
        Option('show_create_mode', bool, default=False),
    )
