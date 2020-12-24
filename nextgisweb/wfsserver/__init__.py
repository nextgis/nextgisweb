# -*- coding: utf-8 -*-
from __future__ import division, unicode_literals, print_function, absolute_import

from ..component import Component

from .model import Base, Service
from .wfs_handler import VERSION_DEFAULT, VERSION_SUPPORTED

__all__ = ['Service', 'VERSION_DEFAULT', 'VERSION_SUPPORTED']


class WFSServerComponent(Component):
    identity = 'wfsserver'
    metadata = Base.metadata

    def __init__(self, *args, **kwargs):
        super(WFSServerComponent, self).__init__(*args, **kwargs)
        self.force_schema_validation = False

    def setup_pyramid(self, config):
        from . import api, view
        api.setup_pyramid(self, config)
        view.setup_pyramid(self, config)
