from datetime import datetime
from secrets import token_urlsafe
from uuid import uuid4

import pytest
import transaction
from sqlalchemy import event

from nextgisweb.env import DBSession
from nextgisweb.lib.logging import logger

from nextgisweb.auth import User

from ..model import Resource, ResourceGroup


def pytest_addoption(parser):
    parser.addoption(
        "--ngw-keep-resource-group",
        action="store_true",
        default=False,
        help="Do not delete a test resource group on teardown",
    )


def _delete_recursive(resource_id):
    res = Resource.filter_by(id=resource_id).one()

    def _collect_ids(obj):
        for child in obj.children:
            yield from _collect_ids(child)
        yield obj.id

    ids = list(_collect_ids(res))
    reraise = False

    while len(ids) > 0:
        rest = list()
        for id in ids:
            try:
                with DBSession.begin_nested():
                    obj = Resource.filter_by(id=id).one()
                    DBSession.delete(obj)
            except Exception as exc:
                if reraise:
                    raise exc
                else:
                    rest.append(id)

        if len(rest) == len(ids):
            logger.error("Unable to delete resources: %s", rest)
            reraise = True
        ids = rest


@pytest.fixture(scope="session")
def ngw_resource_group(request, ngw_env):
    with transaction.manager:
        res = ResourceGroup(
            parent_id=0,
            owner_user=User.by_keyname("administrator"),
            display_name="Test resource group ({})".format(datetime.now().isoformat()),
        ).persist()

    yield res.id

    keep = request.config.getoption("--ngw-keep-resource-group")
    with transaction.manager:
        if res := Resource.filter_by(id=res.id).first():
            if not keep or len(res.children) == 0:
                _delete_recursive(res.id)


@pytest.fixture(scope="function")
def ngw_resource_group_sub(ngw_resource_group, ngw_env):
    with transaction.manager:
        res = ResourceGroup(
            parent_id=ngw_resource_group,
            owner_user=User.by_keyname("administrator"),
            display_name=str(uuid4()),
        ).persist()

    yield res.id

    with transaction.manager:
        _delete_recursive(res.id)


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
