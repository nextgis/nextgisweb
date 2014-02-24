# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from sqlalchemy.orm.exc import NoResultFound

from ..component import Component, require
from ..auth import User

from .model import (
    Base,
    Resource,
    ResourceACLRule,
    ResourceGroup,
    MetaDataScope,
    DataScope,
)
from .permission import register_permission
from .interface import IResourceBase
from .serialize import (
    Serializer,
    SerializedProperty,
    SerializedRelationship,
    SerializedResourceRelationship)
from .exception import ResourceError, AccessDenied
from .views import resource_factory

__all__ = [
    'ResourceComponent',
    'Resource',
    'ResourceGroup',
    'MetaDataScope',
    'DataScope',

    'register_permission',
    'IResourceBase',
    'Serializer',
    'SerializedProperty',
    'SerializedRelationship',
    'SerializedResourceRelationship',
    'ResourceError',
    'AccessDenied',
    'resource_factory',
]


@Component.registry.register
class ResourceComponent(Component):
    identity = 'resource'
    metadata = Base.metadata

    @require('security')
    def initialize_db(self):
        administrator = User.filter_by(keyname='administrator').one()
        try:
            ResourceGroup.filter_by(id=0).one()
        except NoResultFound:
            obj = ResourceGroup(id=0, owner_user=administrator,
                                display_name="Основная группа ресурсов")
            obj.acl.append(ResourceACLRule(
                principal=administrator, action='allow'))
            obj.persist()

    @require('security')
    def setup_pyramid(self, config):
        from .views import setup_pyramid
        setup_pyramid(self, config)
