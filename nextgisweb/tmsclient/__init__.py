# -*- coding: utf-8 -*-
from __future__ import division, absolute_import, print_function, unicode_literals

from ..component import Component
from ..lib.config import Option
from .model import Base, Connection, Layer, SCHEME

__all__ = ['Connection', 'Layer']


class TMSClientComponent(Component):
    identity = 'tmsclient'
    metadata = Base.metadata

    def initialize(self):
        super(TMSClientComponent, self).initialize()

        self.headers = {
            'User-Agent': self.options['user_agent']
        }

    def client_settings(self, request):
        return dict(schemes=SCHEME.enum)

    def setup_pyramid(self, config):
        from . import view
        view.setup_pyramid(self, config)

    option_annotations = (
        Option('user_agent', default="NextGIS Web"),
        Option('timeout', float, default=15),  # seconds
    )
