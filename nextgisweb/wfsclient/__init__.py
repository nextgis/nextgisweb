# -*- coding: utf-8 -*-
from __future__ import division, absolute_import, print_function, unicode_literals

from ..component import Component, require
from ..lib.config import Option

from .model import Base, WFSConnection, WFSLayer

__all__ = ['WFSConnection', 'WFSLayer']


class WFSClientComponent(Component):
    identity = 'wfsclient'
    metadata = Base.metadata

    def initialize(self):
        super(WFSClientComponent, self).initialize()

        self.headers = {
            'User-Agent': self.options['user_agent']
        }

    @require('feature_layer')
    def setup_pyramid(self, config):
        from . import api
        from . import view  # NOQA
        api.setup_pyramid(self, config)

    option_annotations = (
        Option('user_agent', default="NextGIS Web"),
        Option('timeout', float, default=60),  # seconds
    )
