# -*- coding: utf-8 -*-
from __future__ import unicode_literals
import re

from sqlalchemy.orm.exc import NoResultFound

from .. import db
from ..lib.config import Option
from ..component import Component, require
from ..auth import User, Group
from ..models import DBSession

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

from .persmission_cache import PermissionCache

__all__ = [
    'Resource',
    'IResourceBase',
    'Serializer',
    'SerializedProperty',
    'SerializedRelationship',
    'SerializedResourceRelationship',
    'Widget',
]


class ResourceComponent(Component):
    identity = 'resource'
    metadata = Base.metadata

    def __init__(self, env, settings):
        super(ResourceComponent, self).__init__(env, settings)

        # setup perm cache
        self.perm_cache_enable = False
        self.perm_cache_instance = None

        if self.perm_cache_enable:
            self.perm_cache_instance = PermissionCache.construct(settings)

    def initialize(self):
        super(ResourceComponent, self).initialize()
        for item in self.options['disabled_cls']:
            Resource.registry[item]

        self.quota_limit = self.options['quota.limit']
        self.quota_resource_cls = self.options['quota.resource_cls']

        self.quota_resource_by_cls = self.parse_quota_resource_by_cls()

    def parse_quota_resource_by_cls(self):
        quota_resource_by_cls = dict()

        if 'quota.resource_by_cls' not in self.settings:
            return quota_resource_by_cls

        quota_resources_pairs = re.split(r'[,\s]+', self.settings['quota.resource_by_cls'])
        if quota_resources_pairs:
            for pair in quota_resources_pairs:
                resource_quota = re.split(r'[:\s]+', pair)
                quota_resource_by_cls[resource_quota[0]] = int(resource_quota[1])

        return quota_resource_by_cls

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

            everyone_permissions = self.settings.get('everyone_permissions')
            if everyone_permissions is not None:
                everyone = User.filter_by(keyname='everyone').one()
                perm_list = re.split(r'\,\s*', everyone_permissions)
                for perm in perm_list:
                    m = re.match(r'(\w+)\:\s*(\w+)', perm)
                    if m:
                        scope_ident = m.group(1)
                        permission_ident = m.group(2)
                    else:
                        m = re.match(r'(\w+)', perm)
                        if m:
                            scope_ident = m.group(1)
                            permission_ident = None
                        else:
                            raise ValueError("Invalid permission: %s!" % perm)

                    obj.acl.append(ACLRule(
                        principal=everyone, action='allow',
                        scope=scope_ident, permission=permission_ident))

            obj.persist()

    @require('auth')
    def setup_pyramid(self, config):
        from . import view, api
        view.setup_pyramid(self, config)
        api.setup_pyramid(self, config)

    def query_stat(self):
        query = DBSession.query(Resource.cls, db.func.count(Resource.id)) \
            .group_by(Resource.cls)

        total = 0
        by_cls = dict()
        for cls, count in query.all():
            by_cls[cls] = count
            total += count

        query = DBSession.query(db.func.max(Resource.creation_date))
        cdate = query.scalar()

        return dict(
            resource_count=dict(total=total, cls=by_cls),
            last_creation_date=cdate)

    option_annotations = (
        Option('disabled_cls', list, default=[], doc="Resource classes disabled for creation."),
        Option('quota.limit', int, default=None),
        Option('quota.resource_cls', list, default=None),
        Option('quota.resource_by_cls'),
        Option('everyone_permissions', doc="Permissions for user Everyone"),
    )
