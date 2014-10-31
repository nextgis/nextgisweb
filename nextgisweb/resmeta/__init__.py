# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from ..component import Component
from .model import Base


@Component.registry.register
class ResourceMetadataComponent(Component):
    identity = 'resmeta'
    metadata = Base.metadata
