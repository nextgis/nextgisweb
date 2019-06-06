# -*- coding: utf-8 -*-
from __future__ import absolute_import, print_function, unicode_literals

import pytest

from nextgisweb.pytest import env, tx_abort
from nextgisweb.models import DBSession


def test_conn(tx_abort):
    assert DBSession.execute("SELECT true").scalar()
