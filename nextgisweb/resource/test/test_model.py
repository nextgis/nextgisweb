# -*- coding: utf-8 -*-
from __future__ import absolute_import, print_function, unicode_literals

import pytest
from sqlalchemy.exc import IntegrityError

from nextgisweb.models import DBSession
from nextgisweb.resource import ResourceGroup
from nextgisweb.auth import User


def test_same_display_name(txn):
    margs=dict(
        parent_id=0, display_name='display name',
        owner_user=User.by_keyname('administrator'))

    with pytest.raises(IntegrityError, match='"resource_parent_id_display_name_key"'):
        ResourceGroup(**margs).persist()
        ResourceGroup(**margs).persist()
        DBSession.flush()

