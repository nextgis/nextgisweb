# -*- coding: utf-8 -*-
from __future__ import division, absolute_import, print_function, unicode_literals

from sqlalchemy import func

from ..component import Component, require
from ..core import (
    storage_stat_dimension,
    KindOfData,
)
from ..lib.config import Option
from ..models import DBSession

from .model import Base, VectorLayer, SCHEMA
from .util import _
from . import command  # NOQA

__all__ = [
    'VectorLayerComponent',
    'VectorLayer',
]


class VectorLayerData(KindOfData):
    identity = 'vector_layer_data'
    display_name = _("Vector layer data")


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
            # Size of vector layer table without indexes
            size = DBSession.query(func.pg_relation_size(
                '"{}"."{}"'.format(SCHEMA, resource._tablename)
            )).scalar()

            if size == 0:
                continue

            storage_stat_dimension.insert(dict(
                timestamp=timestamp,
                component=self.identity,
                kind_of_data=VectorLayerData.identity,
                resource_id=resource.id,
                value_data_volume=size
            )).execute()

    option_annotations = (
        Option('show_create_mode', bool, default=False),
    )
