from datetime import datetime
from uuid import uuid4

import pytest
import transaction

from nextgisweb.env import DBSession
from nextgisweb.lib.logging import logger

from nextgisweb.auth import User

from ..model import Resource, ResourceGroup


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
def ngw_resource_group(ngw_env):
    with transaction.manager:
        res = ResourceGroup(
            parent_id=0,
            owner_user=User.by_keyname("administrator"),
            display_name="Test resource group ({})".format(datetime.now().isoformat()),
        ).persist()

    yield res.id

    with transaction.manager:
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
