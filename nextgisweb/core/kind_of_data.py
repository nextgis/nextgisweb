# -*- coding: utf-8 -*-
from __future__ import division, absolute_import, print_function, unicode_literals

from ..registry import registry_maker

from .util import _

__all__ = [
    'kind_of_data_registry',
    'raster_layer_data',
    'vector_layer_data',
]

kind_of_data_registry = registry_maker()


class KindOfData:

    def __init__(self, identity, display_name):
        self.identity = identity
        self.display_name = display_name

        kind_of_data_registry.register(self)


raster_layer_data = KindOfData(
    'raster_layer_data',
    _("Raster layer data"))

vector_layer_data = KindOfData(
    'vector_layer_data',
    _("Vector layer data"))
