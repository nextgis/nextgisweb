# -*- coding: utf-8 -*-
from __future__ import absolute_import, print_function, unicode_literals

import pytest
from transaction import manager as transaction_manager

from .env import Env, setenv, env as menv
from .models import DBSession


@pytest.fixture(scope='session')
def env():
    xenv = menv()
    if xenv:
        return xenv
    xenv = Env()
    xenv.initialize()
    setenv(xenv)
    return xenv


@pytest.fixture
def tx_abort(env):
    with transaction_manager as tx:
        yield
        try:
            DBSession.flush()
            tx.abort()
        finally:
            DBSession.expunge_all()
            DBSession.expire_all()
