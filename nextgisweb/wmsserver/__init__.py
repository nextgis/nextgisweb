# -*- coding: utf-8 -*-
from ..component import Component
from .model import Base, Service

__all__ = ['Service', ]


class WMSServerComponent(Component):
    identity = 'wmsserver'
    metadata = Base.metadata

    def setup_pyramid(self, config):
        from . import view
        view.setup_pyramid(self, config)
