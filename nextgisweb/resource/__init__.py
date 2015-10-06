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
from .util import _

from .exception import *    # NOQA
from .interface import *    # NOQA
from .model import *        # NOQA
from .scope import *        # NOQA
from .permission import *   # NOQA
from .view import *         # NOQA
from .widget import *       # NOQA

from .persmission_cache import PermissionCache, settings_info as cache_settings_info

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

    def __init__(self, env, settings):
        super(ResourceComponent, self).__init__(env, settings)

        # setup perm cache
        self.perm_cache_enable = False
        self.perm_cache_instance = None

        cache_enabled_sett = settings.get('perm_cache.enable', 'false').lower()
        self.perm_cache_enable = cache_enabled_sett in ('true', 'yes', '1')

        if self.perm_cache_enable:
            self.perm_cache_instance = PermissionCache.construct(settings)

    @require('auth')
    def initialize_db(self):
        adminusr = User.filter_by(keyname='administrator').one()
        admingrp = Group.filter_by(keyname='administrators').one()

        try:
            ResourceGroup.filter_by(id=0).one()
        except NoResultFound:
            obj = ResourceGroup(
                id=0, owner_user=adminusr,
                display_name=self.env.core.localizer().translate(
                    _("Main resource group")))

            obj.acl.append(ACLRule(
                principal=admingrp,
                action='allow'))

            obj.persist()

    @require('auth')
    def setup_pyramid(self, config):
        from . import view, api
        view.setup_pyramid(self, config)
        api.setup_pyramid(self, config)

    settings_info = () + cache_settings_info
