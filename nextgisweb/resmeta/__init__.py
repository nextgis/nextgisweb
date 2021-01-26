# -*- coding: utf-8 -*-
from __future__ import division, absolute_import, print_function, unicode_literals

from ..component import Component, require

from .util import COMP_ID
from .model import Base, ResourceMetadataItem

__all__ = ['ResourceMetadataItem']


class ResourceMetadataComponent(Component):
    identity = COMP_ID
    metadata = Base.metadata

    @require('resource')
    def setup_pyramid(self, config):
        from . import view  # NOQA
        view.setup_pyramid(self, config)
