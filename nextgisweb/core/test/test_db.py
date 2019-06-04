# -*- coding: utf-8 -*-
from __future__ import absolute_import, print_function, unicode_literals

import pytest

from nextgisweb.fixture import env, tx_abort
from nextgisweb.models import DBSession
from nextgisweb.core import Setting


def test_conn(env):
    assert DBSession.execute("SELECT true").scalar()


def test_tx_abort(tx_abort):
    pass