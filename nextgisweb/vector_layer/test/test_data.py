# -*- coding: utf-8 -*-
from __future__ import absolute_import, print_function, unicode_literals
import os.path
from uuid import uuid4

import pytest
from sqlalchemy.exc import IntegrityError
from osgeo import ogr

from nextgisweb.models import DBSession
from nextgisweb.auth import User
from nextgisweb.spatial_ref_sys import SRS
from nextgisweb.feature_layer import FIELD_TYPE
from nextgisweb.vector_layer import VectorLayer


DATA_PATH = os.path.join(os.path.dirname(
    os.path.abspath(__file__)), 'data')


def test_from_fields(txn):
    res = VectorLayer(
        parent_id=0, display_name='from_fields',
        owner_user=User.by_keyname('administrator'),
        geometry_type='POINT',
        srs=SRS.filter_by(id=3857).one(),
        tbl_uuid=unicode(uuid4().hex),
    )
    
    res.setup_from_fields([
        dict(keyname='integer', datatype=FIELD_TYPE.INTEGER),
        dict(keyname='bigint', datatype=FIELD_TYPE.BIGINT),
        dict(keyname='real', datatype=FIELD_TYPE.REAL),
        dict(keyname='string', datatype=FIELD_TYPE.STRING),
        dict(keyname='date', datatype=FIELD_TYPE.DATE),
        dict(keyname='time', datatype=FIELD_TYPE.TIME),
        dict(keyname='datetime', datatype=FIELD_TYPE.DATETIME),
    ])
    
    res.persist()
    
    DBSession.flush()


@pytest.mark.parametrize('data', ('point-shapefile', 'point-geojson', 'point-kml'))
def test_from_ogr(txn, data):
    src = os.path.join(DATA_PATH, data)
    dsource = ogr.Open(src)
    layer = dsource.GetLayer(0)

    res = VectorLayer(
        parent_id=0, display_name='from_ogr',
        owner_user=User.by_keyname('administrator'),
        srs=SRS.filter_by(id=3857).one(),
        tbl_uuid=unicode(uuid4().hex),
    )
    
    res.persist()

    res.setup_from_ogr(layer, lambda x: x)
    res.load_from_ogr(layer, lambda x: x)

    DBSession.flush()
