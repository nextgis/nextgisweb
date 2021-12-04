from contextlib import contextmanager

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


@pytest.fixture()
def ngw_core_settings_override(ngw_env):
    def set_or_delete(comp, name, value):
        if value is None:
            ngw_env.core.settings_delete(comp, name)
        else:
            ngw_env.core.settings_set(comp, name, value)

    @contextmanager
    def wrapped(settings):
        restore = list()

        with manager:
            for comp, name, value in settings:
                try:
                    rvalue = ngw_env.core.settings_get(comp, name)
                except KeyError:
                    rvalue = None
                restore.append((comp, name, rvalue))
                set_or_delete(comp, name, value)

        yield

        with manager:
            for comp, name, rvalue in restore:
                set_or_delete(comp, name, rvalue)

    return wrapped
