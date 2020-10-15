# -*- coding: utf-8 -*-
from __future__ import division, unicode_literals, print_function, absolute_import

from ..component import Component

from .model import Base


class LookupTableComponent(Component):
    identity = 'lookup_table'
    metadata = Base.metadata

    def setup_pyramid(self, config):
        from . import view  # NOQA
        view.setup_pyramid(self, config)
