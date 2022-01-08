from datetime import datetime

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
        def recurse_children(res):
            for child in res.children:
                DBSession.delete(child)
            DBSession.delete(res)
        
        with DBSession.no_autoflush:
            recurse_children(ResourceGroup.filter_by(id=res.id).one())
