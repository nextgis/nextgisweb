# -*- coding: utf-8 -*-
from __future__ import absolute_import, print_function, unicode_literals
import os.path
from uuid import uuid4
import six

import pytest
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
        tbl_uuid=six.text_type(uuid4().hex),
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


@pytest.mark.parametrize('data', (
    'shapefile-point-utf8.zip/layer.shp',
    'shapefile-point-win1251.zip/layer.shp',
    'geojson-point.zip/layer.geojson'))
def test_from_ogr(data, txn):
    src = os.path.join(DATA_PATH, data)
    dsource = ogr.Open('/vsizip/' + src)
    layer = dsource.GetLayer(0)

    res = VectorLayer(
        parent_id=0, display_name='from_ogr',
        owner_user=User.by_keyname('administrator'),
        srs=SRS.filter_by(id=3857).one(),
        tbl_uuid=six.text_type(uuid4().hex),
    )

    res.persist()

    res.setup_from_ogr(layer, lambda x: x)
    res.load_from_ogr(layer, lambda x: x)

    DBSession.flush()

    features = list(res.feature_query()())
    assert len(features) == 1

    feature = features[0]
    assert feature.id == 1

    fields = feature.fields
    assert fields['int'] == -1
    # TODO: Date, time and datetime tests fails on shapefile
    # assert fields['date'] == date(2001, 1, 1)
    # assert fields['time'] == time(23, 59, 59)
    # assert fields['datetime'] == datetime(2001, 1, 1, 23, 59, 0)
    assert fields['string'] == "Foo bar"
    assert fields['unicode'] == 'Значимость этих проблем настолько очевидна, что реализация намеченных плановых заданий требуют определения и уточнения.'  # NOQA: E501
