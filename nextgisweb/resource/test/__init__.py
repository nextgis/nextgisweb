from datetime import datetime
from uuid import uuid4

import pytest
import transaction

from nextgisweb.models import DBSession
from nextgisweb.auth import User

from nextgisweb.resource.model import ResourceGroup


@pytest.fixture(scope='session')
def ngw_resource_group(ngw_env):
    with transaction.manager:
        res = ResourceGroup(
            parent_id=0, owner_user=User.by_keyname('administrator'),
            display_name='Test resource group ({})'.format(datetime.now().isoformat()),
        ).persist()

    yield res.id

    with transaction.manager:
        with DBSession.no_autoflush:
            delete_recursive(ResourceGroup.filter_by(id=res.id).one())


@pytest.fixture(scope='function')
def ngw_resource_group_sub(ngw_resource_group, ngw_env):
    with transaction.manager:
        res = ResourceGroup(
            parent_id=ngw_resource_group, owner_user=User.by_keyname('administrator'),
            display_name=str(uuid4()),
        ).persist()

    yield res.id

    with transaction.manager:
        with DBSession.no_autoflush:
            delete_recursive(ResourceGroup.filter_by(id=res.id).one())


def delete_recursive(res):
    for child in res.children:
        DBSession.delete(child)
    DBSession.delete(res)
