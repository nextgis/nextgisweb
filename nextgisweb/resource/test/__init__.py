from datetime import datetime
from secrets import token_urlsafe
from uuid import uuid4

import pytest
import transaction
from sqlalchemy import event

from nextgisweb.auth import User

from ..model import Resource, ResourceGroup


@pytest.fixture(scope="session")
def ngw_resource_group(request, ngw_env):
    with transaction.manager:
        res = ResourceGroup(
            parent_id=0,
            owner_user=User.by_keyname("administrator"),
            display_name="Test resource group ({})".format(datetime.now().isoformat()),
        ).persist()

    yield res.id


@pytest.fixture(scope="function")
def ngw_resource_group_sub(ngw_resource_group, ngw_env):
    with transaction.manager:
        res = ResourceGroup(
            parent_id=ngw_resource_group,
            owner_user=User.by_keyname("administrator"),
            display_name=str(uuid4()),
        ).persist()

    yield res.id


@pytest.fixture(scope="module")
def ngw_resource_defaults(ngw_resource_group):
    @event.listens_for(Resource, "init", propagate=True)
    def receive_init(target, args, kw):
        from nextgisweb.layer import SpatialLayerMixin
        from nextgisweb.spatial_ref_sys import SRS

        if "parent" not in kw and "parent_id" not in kw:
            kw["parent_id"] = ngw_resource_group
        if "owner_user" not in kw and "owner_user_id" not in kw:
            user = User.by_keyname("administrator")
            kw["owner_user"] = user
        if "display_name" not in kw:
            base = str(target.cls_display_name)
            kw["display_name"] = base + " " + token_urlsafe(6)

        # TODO: Register this default from spatial_ref_sys component
        if "srs" not in kw and "srs_id" not in kw and isinstance(target, SpatialLayerMixin):
            kw["srs"] = SRS.filter_by(id=3857).one()

    yield

    event.remove(Resource, "init", receive_init)
