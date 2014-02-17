# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from ..component import Component, require

from .models import (
    Base,
    Resource,
    ResourceGroup,
    MetaDataScope,
    DataScope)

from .permission import register_permission
from .interface import IResourceBase
from .views import resource_factory

__all__ = [
    'ResourceComponent',
    'Resource',
    'ResourceGroup',
    'MetaDataScope',
    'DataScope',

    'register_permission',
    'IResourceBase',
    'resource_factory',
]


@Component.registry.register
class ResourceComponent(Component):
    identity = 'resource'
    metadata = Base.metadata

    @require('security')
    def initialize_db(self):
        from .models import initialize_db
        initialize_db(self)

    @require('security')
    def setup_pyramid(self, config):
        from .views import setup_pyramid
        setup_pyramid(self, config)
