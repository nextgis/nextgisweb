# -*- coding: utf-8 -*-
from __future__ import division, absolute_import, print_function, unicode_literals
import os.path
import six
from datetime import date, time, datetime
from uuid import uuid4

import pytest
from osgeo import gdal
from osgeo import ogr

from nextgisweb.compat import Path
from nextgisweb.models import DBSession
from nextgisweb.auth import User
from nextgisweb.spatial_ref_sys import SRS
from nextgisweb.feature_layer import FIELD_TYPE
from nextgisweb.vector_layer import VectorLayer


DATA_PATH = os.path.join(os.path.dirname(
    os.path.abspath(__file__)), 'data')


def test_from_fields(ngw_resource_group, ngw_txn):
    res = VectorLayer(
        parent_id=ngw_resource_group, display_name='from_fields',
        owner_user=User.by_keyname('administrator'),
        geometry_type='POINT',
        srs=SRS.filter_by(id=3857).one(),
        tbl_uuid=six.text_type(uuid4().hex),
    )

    res.setup_from_fields([
        dict(keyname='integer', datatype=FIELD_TYPE.INTEGER),
        dict(keyname='bigint', datatype=FIELD_TYPE.BIGINT),
        dict(keyname='real', datatype=FIELD_TYPE.REAL),
        dict(keyname='string', datatype=FIELD_TYPE.STRING, label_field=True),
        dict(keyname='date', datatype=FIELD_TYPE.DATE),
        dict(keyname='time', datatype=FIELD_TYPE.TIME),
        dict(keyname='datetime', datatype=FIELD_TYPE.DATETIME),
    ])

    res.persist()

    assert res.feature_label_field.keyname == 'string'

    DBSession.flush()


@pytest.mark.parametrize('data', (
    'shapefile-point-utf8.zip/layer.shp',
    'shapefile-point-win1251.zip/layer.shp',
    'geojson-point.zip/layer.geojson'))
def test_from_ogr(data, ngw_resource_group, ngw_txn):
    src = os.path.join(DATA_PATH, data)
    dsource = ogr.Open('/vsizip/' + src)
    layer = dsource.GetLayer(0)

    res = VectorLayer(
        parent_id=ngw_resource_group, display_name='from_ogr',
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


def test_type_geojson(ngw_resource_group, ngw_txn):
    src = Path(__file__).parent / 'data' / 'type.geojson'

    dataset = ogr.Open(str(src))
    assert dataset is not None, gdal.GetLastErrorMsg()

    layer = dataset.GetLayer(0)
    assert layer is not None, gdal.GetLastErrorMsg()

    res = VectorLayer(
        parent_id=ngw_resource_group, display_name='from_ogr',
        owner_user=User.by_keyname('administrator'),
        srs=SRS.filter_by(id=3857).one(),
        tbl_uuid=six.text_type(uuid4().hex))

    res.persist()

    res.setup_from_ogr(layer, lambda x: x)
    res.load_from_ogr(layer, lambda x: x)
    layer.ResetReading()

    DBSession.flush()

    def field_as(f, n, t):
        fidx = f.GetFieldIndex(n)
        if f.IsFieldNull(fidx):
            return None

        attr = getattr(f, 'GetFieldAs' + t)
        result = attr(fidx)

        if t in ('Date', 'Time', 'DateTime'):
            result = [int(v) for v in result]

        if t == 'String' and six.PY2:
            result = result.decode('utf-8')

        return result

    for feat, ref in zip(res.feature_query()(), layer):
        fields = feat.fields
        assert fields['null'] == field_as(ref, 'null', None)
        assert fields['int'] == field_as(ref, 'int', 'Integer')
        assert fields['real'] == field_as(ref, 'real', 'Double')
        assert fields['date'] == date(*field_as(ref, 'date', 'DateTime')[0:3])
        assert fields['time'] == time(*field_as(ref, 'time', 'DateTime')[3:6])
        assert fields['datetime'] == datetime(*field_as(ref, 'datetime', 'DateTime')[0:6])
        assert fields['string'] == field_as(ref, 'string', 'String')
        assert fields['unicode'] == field_as(ref, 'unicode', 'String')


@pytest.mark.parametrize('fid_source, fid_field, id_expect', (
    ('SEQUENCE', None, 1),
    ('FIELD', 'int', -1),
    ('AUTO', 'int', -1),
    ('AUTO', 'not_exists', 1),
))
def test_fid(fid_source, fid_field, id_expect, ngw_resource_group, ngw_txn):
    src = Path(__file__).parent / 'data' / 'type.geojson'

    dataset = ogr.Open(str(src))
    assert dataset is not None, gdal.GetLastErrorMsg()

    layer = dataset.GetLayer(0)
    assert layer is not None, gdal.GetLastErrorMsg()

    res = VectorLayer(
        parent_id=ngw_resource_group, display_name='test_fid',
        owner_user=User.by_keyname('administrator'),
        srs=SRS.filter_by(id=3857).one(),
        tbl_uuid=six.text_type(uuid4().hex))

    res.persist()

    res.setup_from_ogr(layer)
    res.load_from_ogr(layer, fid_params=dict(fid_source=fid_source, fid_field=fid_field))

    DBSession.flush()

    query = res.feature_query()
    query.filter_by(id=id_expect)
    assert query().total_count == 1
