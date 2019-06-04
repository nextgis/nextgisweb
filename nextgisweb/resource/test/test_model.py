# -*- coding: utf-8 -*-
from __future__ import absolute_import, print_function, unicode_literals

import pytest
from sqlalchemy.exc import IntegrityError

from nextgisweb.fixture import env, tx_abort
from nextgisweb.models import DBSession
from nextgisweb.resource import ResourceGroup
from nextgisweb.auth import User


def test_same_display_name(tx_abort):
    margs=dict(
        display_name='Display name',
        owner_user=User.by_keyname('administrator'))
    exc = False
    try:
        ResourceGroup(**margs).persist()
        ResourceGroup(**margs).persist()
        DBSession.flush()
    except IntegrityError:
        exc = True
    assert exc

