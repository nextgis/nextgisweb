import re

from sqlalchemy.orm.exc import NoResultFound

from nextgisweb.env import Component, DBSession, _, require
from nextgisweb.lib import db
from nextgisweb.lib.config import Option
from nextgisweb.lib.logging import logger

from nextgisweb.auth import Group, User

from .exception import QuotaExceeded
from .model import Resource, ResourceGroup
from .model import ResourceACLRule as ACLRule


class ResourceComponent(Component):
    def initialize(self):
        super().initialize()
        for item in self.options["disabled_cls"]:
            try:
                Resource.registry[item]
            except KeyError:
                logger.error("Resource class '%s' from disabled_cls option not found!", item)

        self.quota_limit = self.options["quota.limit"]
        self.quota_resource_cls = self.options["quota.resource_cls"]

        self.quota_resource_by_cls = self.parse_quota_resource_by_cls()

    def parse_quota_resource_by_cls(self):
        quota_resource_by_cls = dict()

        ovalue = self.options.get("quota.resource_by_cls", None)
        if ovalue is None:
            return quota_resource_by_cls

        quota_resources_pairs = re.split(r"[,\s]+", ovalue)
        if quota_resources_pairs:
            for pair in quota_resources_pairs:
                resource_quota = re.split(r"[:\s]+", pair)
                quota_resource_by_cls[resource_quota[0]] = int(resource_quota[1])

        return quota_resource_by_cls

    def quota_check(self, data):
        required_total = 0

        for cls, required in data.items():
            if self.quota_resource_cls is None or cls in self.quota_resource_cls:
                required_total += required

            # Quota per resource class checking
            if cls in self.quota_resource_by_cls:
                query = DBSession.query(db.func.count(Resource.id)).filter(Resource.cls == cls)

                with DBSession.no_autoflush:
                    count = query.scalar()

                cls_quota_limit = self.quota_resource_by_cls[cls]
                if count + required > cls_quota_limit:
                    raise QuotaExceeded(
                        cls=Resource.registry[cls],
                        required=required,
                        limit=cls_quota_limit,
                        count=count,
                    )

        # Total quota checking
        if self.quota_limit is not None:
            query = DBSession.query(db.func.count(Resource.id))
            if self.quota_resource_cls is not None:
                query = query.filter(Resource.cls.in_(self.quota_resource_cls))

            with DBSession.no_autoflush:
                count_total = query.scalar()

            if count_total + required_total > self.quota_limit:
                raise QuotaExceeded(
                    cls=None, required=required_total, limit=self.quota_limit, count=count_total
                )

    @require("auth")
    def initialize_db(self):
        adminusr = User.filter_by(keyname="administrator").one()
        admingrp = Group.filter_by(keyname="administrators").one()

        try:
            ResourceGroup.filter_by(id=0).one()
        except NoResultFound:
            obj = ResourceGroup(
                id=0,
                owner_user=adminusr,
                display_name=self.env.core.localizer().translate(_("Main resource group")),
            )

            obj.acl.append(ACLRule(principal=admingrp, action="allow"))

            obj.persist()

    @require("auth")
    def setup_pyramid(self, config):
        from . import api, view

        view.setup_pyramid(self, config)
        api.setup_pyramid(self, config)

    def client_settings(self, request):
        result = dict()
        try:
            result["resource_export"] = request.env.core.settings_get(
                "resource", "resource_export"
            )
        except KeyError:
            result["resource_export"] = "data_read"
        return result

    def query_stat(self):
        query = DBSession.query(Resource.cls, db.func.count(Resource.id)).group_by(Resource.cls)

        total = 0
        by_cls = dict()
        for cls, count in query.all():
            by_cls[cls] = count
            total += count

        query = DBSession.query(db.func.max(Resource.creation_date))
        cdate = query.scalar()

        return dict(resource_count=dict(total=total, cls=by_cls), last_creation_date=cdate)

    # fmt: off
    option_annotations = (
        Option("disabled_cls", list, default=[], doc="Resource classes disabled for creation."),
        Option("disable.*", bool, default=False, doc="Disable creation of specific resources."),
        Option("quota.limit", int, default=None),
        Option("quota.resource_cls", list, default=None),
        Option("quota.resource_by_cls"),
    )
    # fmt: on
