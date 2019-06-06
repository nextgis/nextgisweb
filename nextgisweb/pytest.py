# -*- coding: utf-8 -*-
from __future__ import absolute_import, print_function, unicode_literals

import pytest
from transaction import manager as transaction_manager

import nextgisweb.env
from nextgisweb.models import DBSession


def _env_initialize():
    result = nextgisweb.env.env()
    if result:
        return result
    result = nextgisweb.env.Env()
    result.initialize()
    nextgisweb.env.setenv(result)
    return result


@pytest.fixture(scope='session')
def env():
    return _env_initialize()


@pytest.fixture
def tx_abort():
    _env_initialize()
    with transaction_manager as tx:
        yield
        try:
            DBSession.flush()
            tx.abort()
        finally:
            DBSession.expunge_all()
            DBSession.expire_all()
