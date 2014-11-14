# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from sqlalchemy.orm.exc import NoResultFound

from ..component import Component, require
from ..auth import User, Group

from .model import (
    Base,
    Resource,
    ResourceGroup,
    ResourceACLRule as ACLRule)
from .serialize import (
    Serializer,
    SerializedProperty,
    SerializedRelationship,
    SerializedResourceRelationship)

from .exception import *    # NOQA
from .interface import *    # NOQA
from .model import *        # NOQA
from .scope import *        # NOQA
from .permission import *   # NOQA
from .view import *         # NOQA
from .widget import *       # NOQA

__all__ = [
    'Resource',
    'IResourceBase',
    'Serializer',
    'SerializedProperty',
    'SerializedRelationship',
    'SerializedResourceRelationship',
    'Widget',
]


@Component.registry.register
class ResourceComponent(Component):
    identity = 'resource'
    metadata = Base.metadata

    @require('auth')
    def initialize_db(self):
        adminusr = User.filter_by(keyname='administrator').one()
        admingrp = Group.filter_by(keyname='administrators').one()
        everyone = User.filter_by(keyname='everyone').one()

        try:
            ResourceGroup.filter_by(id=0).one()
        except NoResultFound:
            obj = ResourceGroup(id=0, owner_user=adminusr,
                                display_name="Основная группа ресурсов")

            obj.acl.append(ACLRule(
                principal=admingrp,
                action='allow'))

            obj.acl.append(ACLRule(
                principal=everyone,
                scope='resource',
                permission='delete',
                action='deny',
                propagate=False))

            obj.persist()

    @require('auth')
    def setup_pyramid(self, config):
        from . import view, api
        view.setup_pyramid(self, config)
        api.setup_pyramid(self, config)
