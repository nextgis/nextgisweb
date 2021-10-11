import pytest
from transaction import manager

from nextgisweb.models import DBSession


@pytest.fixture()
def ngw_txn(ngw_env):
    with manager as t:
        yield t
        try:
            DBSession.flush()
            t.abort()
        finally:
            DBSession.expunge_all()
            DBSession.expire_all()
