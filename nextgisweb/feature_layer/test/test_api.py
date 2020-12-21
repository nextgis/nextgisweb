# -*- coding: utf-8 -*-
from __future__ import division, absolute_import, print_function, unicode_literals

import json
import pytest
import six
import transaction

from uuid import uuid4
from osgeo import ogr

from nextgisweb.auth import User
from nextgisweb.models import DBSession
from nextgisweb.spatial_ref_sys.models import SRS
from nextgisweb.vector_layer import VectorLayer


def test_identify(ngw_webtest_app):
    data = {
        'srs': 3857,
        'geom': 'POLYGON((0 0,0 1,1 1,1 0,0 0))',
        'layers': []
    }
    resp = ngw_webtest_app.post_json('/api/feature_layer/identify', data, status=200)
    assert resp.json['featureCount'] == 0


@pytest.fixture(scope='module')
def vector_layer_id(ngw_resource_group):
    with transaction.manager:

        obj = VectorLayer(
            parent_id=ngw_resource_group, display_name='vector_layer',
            owner_user=User.by_keyname('administrator'),
            srs=SRS.filter_by(id=3857).one(),
            tbl_uuid=six.text_type(uuid4().hex),
        ).persist()

        geojson = {
            'type': 'FeatureCollection',
            'crs': {'type': 'name', 'properties': {'name': 'urn:ogc:def:crs:EPSG::3857'}},
            'features': [{
                'type': 'Feature',
                'properties': {'name': 'feature1'},
                'geometry': {'type': 'Point', 'coordinates': [0, 0]}
            }, {
                'type': 'Feature',
                'properties': {'price': -1},
                'geometry': {'type': 'Point', 'coordinates': [0, 0]}
            }]
        }
        dsource = ogr.Open(json.dumps(geojson))
        layer = dsource.GetLayer(0)

        obj.setup_from_ogr(layer, lambda x: x)
        obj.load_from_ogr(layer, lambda x: x)

        DBSession.flush()
        DBSession.expunge(obj)

    yield obj.id

    with transaction.manager:
        DBSession.delete(VectorLayer.filter_by(id=obj.id).one())


def test_fields_edit(ngw_webtest_app, vector_layer_id, ngw_auth_administrator):
    resp = ngw_webtest_app.get('/api/resource/%d' % vector_layer_id)
    fields = resp.json['feature_layer']['fields']

    assert len(fields) == 2

    resp = ngw_webtest_app.get('/api/resource/%d/feature/1' % vector_layer_id)
    feature_fields = resp.json['fields']

    assert len(feature_fields) == 2

    fields.append(dict(
        keyname='new_field',
        datatype='DATETIME',
        typemod=None,
        display_name='new_field',
        label_field=False,
        grid_visibility=True
    ))
    ngw_webtest_app.put_json('/api/resource/%d' % vector_layer_id, {
        'feature_layer': {'fields': fields}
    }, status=200)
    resp = ngw_webtest_app.get('/api/resource/%d/feature/1' % vector_layer_id)
    feature_fields = resp.json['fields']

    assert len(feature_fields) == 3

    resp = ngw_webtest_app.get('/api/resource/%d' % vector_layer_id)
    fields = resp.json['feature_layer']['fields']

    assert len(fields) == 3

    fields = [fields[2], fields[0]]
    ngw_webtest_app.put_json('/api/resource/%d' % vector_layer_id, {
        'feature_layer': {'fields': fields}
    }, status=200)
    resp = ngw_webtest_app.get('/api/resource/%d' % vector_layer_id)
    fields = resp.json['feature_layer']['fields']

    assert len(fields) == 3
    assert fields[0]['keyname'] == 'new_field'
    assert fields[1]['keyname'] == 'name'
    assert fields[2]['keyname'] == 'price'

    fields[2]['delete'] = True
    ngw_webtest_app.put_json('/api/resource/%d' % vector_layer_id, {
        'feature_layer': {'fields': fields}
    }, status=200)
    resp = ngw_webtest_app.get('/api/resource/%d' % vector_layer_id)
    fields = resp.json['feature_layer']['fields']

    assert len(fields) == 2


def test_geom_edit(ngw_webtest_app, vector_layer_id, ngw_auth_administrator):
    feature_url = '/api/resource/%d/feature/1' % vector_layer_id

    feature = ngw_webtest_app.get(feature_url).json
    assert feature['geom'] == 'POINT (0.0000000000000000 0.0000000000000000)'

    feature = ngw_webtest_app.get(feature_url + '?geom_format=geojson').json
    assert feature['geom'] == dict(type='Point', coordinates=[0.0, 0.0])

    feature['geom'] = 'POINT (1 0)'
    ngw_webtest_app.put_json(feature_url, feature)
    feature = ngw_webtest_app.get(feature_url).json
    assert feature['geom'] == 'POINT (1.0000000000000000 0.0000000000000000)'

    feature['geom'] = dict(type='Point', coordinates=[1, 2])
    ngw_webtest_app.put_json(feature_url + '?geom_format=geojson', feature)
    assert feature == ngw_webtest_app.get(feature_url + '?geom_format=geojson').json

    feature = ngw_webtest_app.get(feature_url).json
    assert feature['geom'] == 'POINT (1.0000000000000000 2.0000000000000000)'

    feature['geom'] = dict(type='Point', coordinates=[90, 45])
    ngw_webtest_app.put_json(feature_url + '?geom_format=geojson&srs=4326', feature)
    feature = ngw_webtest_app.get(feature_url + '?geom_format=geojson&srs=3857').json
    coords = feature['geom']['coordinates']
    assert round(coords[0], 3) == 10018754.171
    assert round(coords[1], 3) == 5621521.486


def test_cdelete(ngw_webtest_app, vector_layer_id, ngw_auth_administrator):
    url = '/api/resource/%d/feature/' % vector_layer_id

    resp = ngw_webtest_app.delete_json(url, [])
    assert resp.json == []

    resp = ngw_webtest_app.delete_json(url, [dict(id=1)])
    assert resp.json == [1]

    resp = ngw_webtest_app.delete(url)
    assert resp.json

    assert ngw_webtest_app.get(url).json == []


def test_fields_unique(ngw_webtest_app, ngw_auth_administrator, ngw_resource_group):
    url_create = '/api/resource/'

    fields = [dict(
        keyname='keyname1',
        display_name='display_name1',
        datatype='STRING'
    ), dict(
        keyname='keyname1',
        display_name='display_name2',
        datatype='STRING'
    )]

    body_create = dict(
        resource=dict(
            cls='vector_layer',
            parent=dict(id=ngw_resource_group),
            display_name='layer_fields_unique'
        ),
        vector_layer=dict(
            srs=dict(id=3857),
            geometry_type='POINT',
            fields=fields
        )
    )

    ngw_webtest_app.post_json(url_create, body_create, status=422)

    fields[1]['keyname'] = 'keyname2'
    fields[1]['display_name'] = 'display_name1'
    ngw_webtest_app.post_json(url_create, body_create, status=422)

    fields[1]['display_name'] = 'display_name2'
    res = ngw_webtest_app.post_json(url_create, body_create, status=201)

    layer_id = res.json['id']
    url_layer = '/api/resource/%d' % layer_id

    res = ngw_webtest_app.get(url_layer)
    fields = res.json['feature_layer']['fields']

    body_update = dict(
        feature_layer=dict(
            fields=fields
        )
    )

    field2 = None
    for field in fields:
        if field['display_name'] == 'display_name2':
            field2 = field
            break

    field2['display_name'] = 'display_name1'
    ngw_webtest_app.put_json(url_layer, body_update, status=422)

    field2['display_name'] = 'display_name2'
    ngw_webtest_app.put_json(url_layer, body_update, status=200)

    ngw_webtest_app.delete(url_layer)
