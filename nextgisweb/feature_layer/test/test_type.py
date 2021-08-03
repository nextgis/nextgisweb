# -*- coding: utf-8 -*-
from __future__ import division, absolute_import, print_function, unicode_literals

from uuid import uuid4

import pytest
import six
import transaction
from osgeo import ogr

from nextgisweb.auth import User
from nextgisweb.compat import Path
from nextgisweb.models import DBSession
from nextgisweb.spatial_ref_sys import SRS
from nextgisweb.vector_layer import VectorLayer


@pytest.fixture
def type_layer(ngw_resource_group):
    with transaction.manager:
        vl_type = VectorLayer(
            parent_id=ngw_resource_group, display_name='type',
            owner_user=User.by_keyname('administrator'),
            srs=SRS.filter_by(id=3857).one(),
            tbl_uuid=six.text_type(uuid4().hex),
        ).persist()

        import nextgisweb.vector_layer.test
        path = Path(nextgisweb.vector_layer.test.__file__).parent / 'data/type.geojson'
        ogrds = ogr.Open(str(path))
        ogrlayer = ogrds.GetLayer(0)

        vl_type.setup_from_ogr(ogrlayer)
        vl_type.load_from_ogr(ogrlayer)

        DBSession.flush()
        DBSession.expunge(vl_type)

    yield vl_type.id

    with transaction.manager:
        DBSession.delete(VectorLayer.filter_by(id=vl_type.id).one())


def test_datatype(type_layer, ngw_webtest_app, ngw_auth_administrator):
    api_url = '/api/resource/%d/feature/1' % type_layer

    resp = ngw_webtest_app.get(api_url, status=200)
    feature = resp.json
    fields = feature['fields']

    assert fields['date'] == dict(year=2001, month=1, day=1)
    assert fields['time'] == dict(hour=23, minute=59, second=59)
    assert fields['datetime'] == dict(year=2001, month=1, day=1, hour=23, minute=59, second=0)

    resp = ngw_webtest_app.get(api_url, dict(dt_format='iso'))
    fields = resp.json['fields']

    assert fields['date'] == '2001-01-01'
    assert fields['time'] == '23:59:59'
    assert fields['datetime'] == '2001-01-01T23:59:00'

    dt_fields = dict(
        date=dict(year=3001, month=2, day=2),
        time=dict(hour=7, minute=6, second=5),
        datetime=dict(year=1984, month=10, day=26, hour=1, minute=30, second=15)
    )

    ngw_webtest_app.put_json(api_url, dict(fields=dt_fields), status=200)

    resp = ngw_webtest_app.get(api_url)
    fields = resp.json['fields']
    for k, v in dt_fields.items():
        assert fields[k] == v

    dt_fields = dict(
        date='2555-12-31',
        time='15:16:17',
        datetime='0500-03-03T14:30:31'
    )
    ngw_webtest_app.put_json(api_url + '?dt_format=iso', dict(fields=dt_fields), status=200)

    resp = ngw_webtest_app.get(api_url + '?dt_format=iso')
    fields = resp.json['fields']
    for k, v in dt_fields.items():
        assert fields[k] == v
