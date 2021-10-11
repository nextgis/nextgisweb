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

from .events import *    # NOQA
from .exception import *    # NOQA
from .interface import *    # NOQA
from .model import *        # NOQA
from .scope import *        # NOQA
from .permission import *   # NOQA
from .view import *         # NOQA
from .widget import *       # NOQA


__all__ = [  # NOQA: F405
    'AfterResourceCollectionPost',
    'AfterResourcePut',
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

    def initialize(self):
        super().initialize()
        for item in self.options['disabled_cls']:
            try:
                Resource.registry[item]
            except KeyError:
                self.logger.error("Resource class '%s' from disabled_cls option not found!", item)

        self.quota_limit = self.options['quota.limit']
        self.quota_resource_cls = self.options['quota.resource_cls']

        self.quota_resource_by_cls = self.parse_quota_resource_by_cls()

    def parse_quota_resource_by_cls(self):
        quota_resource_by_cls = dict()

        ovalue = self.options.get('quota.resource_by_cls', None)
        if ovalue is None:
            return quota_resource_by_cls

        quota_resources_pairs = re.split(r'[,\s]+', ovalue)
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
        Option('disable.*', bool, default=False, doc="Disable creation of specific resources."),
        Option('quota.limit', int, default=None),
        Option('quota.resource_cls', list, default=None),
        Option('quota.resource_by_cls'),
    )
