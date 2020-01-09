# -*- coding: utf-8 -*-
from __future__ import division, absolute_import, print_function, unicode_literals

from ..component import Component, require
from .model import Base

__all__ = ['FeatureAttachmentComponent', ]


class FeatureAttachmentComponent(Component):
    identity = 'feature_attachment'
    metadata = Base.metadata

    @require('feature_layer')
    def initialize(self):
        from . import extension # NOQA

    def setup_pyramid(self, config):
        from . import api
        api.setup_pyramid(self, config)
