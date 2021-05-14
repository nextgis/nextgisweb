# -*- coding: utf-8 -*-
from __future__ import division, absolute_import, print_function, unicode_literals

from ..component import Component, require
from ..core import storage_stat_dimension
from ..lib.config import Option

from .model import Base, VectorLayer
from . import command  # NOQA

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

    def estimate_storage(self, timestamp):
        for resource in VectorLayer.query():
            for kind_of_data, size in resource.estimate_storage().items():
                storage_stat_dimension.insert(dict(
                    timestamp=timestamp,
                    component=self.identity,
                    kind_of_data=kind_of_data,
                    resource_id=resource.id,
                    value_data_volume=size
                )).execute()

    option_annotations = (
        Option('show_create_mode', bool, default=False),
    )
