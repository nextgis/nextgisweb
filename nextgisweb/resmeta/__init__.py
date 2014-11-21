# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from ..component import Component, require

from .ident import COMP_ID
from .model import Base


@Component.registry.register
class ResourceMetadataComponent(Component):
    identity = COMP_ID
    metadata = Base.metadata

    @require('resource')
    def setup_pyramid(self, config):
        from . import view  # NOQA
        view.setup_pyramid(self, config)
