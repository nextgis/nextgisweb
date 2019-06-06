# -*- coding: utf-8 -*-
from __future__ import absolute_import, print_function, unicode_literals
from uuid import uuid4

import pytest
from sqlalchemy.exc import IntegrityError

from nextgisweb.pytest import tx_abort
from nextgisweb.models import DBSession
from nextgisweb.auth import User
from nextgisweb.spatial_ref_sys import SRS
from nextgisweb.feature_layer import FIELD_TYPE
from nextgisweb.vector_layer import VectorLayer


def test_from_fields(tx_abort):
    res = VectorLayer(
        parent_id=0, display_name='from_fields',
        owner_user=User.by_keyname('administrator'),
        geometry_type='POINT',
        srs=SRS.filter_by(id=3857).one(),
        tbl_uuid=unicode(uuid4().hex),
    )
    
    res.setup_from_fields([
        dict(key='integer', keyname='integer', datatype=FIELD_TYPE.INTEGER),
        dict(key='bigint', keyname='bigint', datatype=FIELD_TYPE.BIGINT),
        dict(key='string', keyname='string', datatype=FIELD_TYPE.STRING),
    ])
    
    res.persist()
    DBSession.flush()
