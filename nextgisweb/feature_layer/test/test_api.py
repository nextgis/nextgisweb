import importlib
import json
from itertools import product

import pytest
import transaction

from uuid import uuid4
from osgeo import ogr

from nextgisweb.auth import User
from nextgisweb.feature_layer.ogrdriver import EXPORT_FORMAT_OGR
from nextgisweb.lib.geometry import Geometry
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
            tbl_uuid=uuid4().hex,
        ).persist()

        geojson = {
            'type': 'FeatureCollection',
            'crs': {'type': 'name', 'properties': {'name': 'urn:ogc:def:crs:EPSG::3857'}},
            'features': [{
                'type': 'Feature',
                'properties': {'price': -1, 'name': 'feature1'},
                'geometry': {'type': 'Point', 'coordinates': [0, 0]}
            }, {
                'type': 'Feature',
                'properties': {'price': -2, 'name': 'feature2'},
                'geometry': {'type': 'Point', 'coordinates': [0, 0]}
            }]
        }
        dsource = ogr.Open(json.dumps(geojson))
        layer = dsource.GetLayer(0)

        obj.setup_from_ogr(layer)
        obj.load_from_ogr(layer)

        DBSession.flush()
        DBSession.expunge(obj)

    yield obj.id

    with transaction.manager:
        DBSession.delete(VectorLayer.filter_by(id=obj.id).one())


def test_fields_edit(ngw_webtest_app, vector_layer_id, ngw_auth_administrator):
    resp = ngw_webtest_app.get('/api/resource/%d' % vector_layer_id)
    fields = resp.json['feature_layer']['fields']

    assert len(fields) == 2
    assert fields[0]['keyname'] == 'price'
    assert fields[1]['keyname'] == 'name'

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
    assert fields[0]['keyname'] == 'name'
    assert fields[1]['keyname'] == 'new_field'
    assert fields[2]['keyname'] == 'price'

    fields[1]['delete'] = True
    ngw_webtest_app.put_json('/api/resource/%d' % vector_layer_id, {
        'feature_layer': {'fields': fields}
    }, status=200)
    resp = ngw_webtest_app.get('/api/resource/%d' % vector_layer_id)
    fields = resp.json['feature_layer']['fields']

    assert len(fields) == 2

    ngw_webtest_app.put_json('/api/resource/%d' % vector_layer_id, dict(
        feature_layer=dict(fields=[dict(
            keyname='new_field2',
            datatype='STRING',
            display_name='new_field2',
        )])
    ), status=200)
    resp = ngw_webtest_app.get('/api/resource/%d' % vector_layer_id)
    fields = resp.json['feature_layer']['fields']

    assert len(fields) == 3
    assert fields[0]['keyname'] == 'name'
    assert fields[1]['keyname'] == 'price'
    assert fields[2]['keyname'] == 'new_field2'


def test_geom_edit(ngw_webtest_app, vector_layer_id, ngw_auth_administrator):

    def wkt_compare(wkt1, wkt2):
        g1 = Geometry.from_wkt(wkt1)
        g2 = Geometry.from_wkt(wkt2)
        return g1.shape.equals(g2.shape)

    feature_url = '/api/resource/%d/feature/1' % vector_layer_id

    feature = ngw_webtest_app.get(feature_url).json
    assert wkt_compare(feature['geom'], 'POINT (0.0 0.0)')

    feature = ngw_webtest_app.get(feature_url + '?geom_format=geojson').json
    assert feature['geom'] == dict(type='Point', coordinates=[0.0, 0.0])

    feature['geom'] = 'POINT (1 0)'
    ngw_webtest_app.put_json(feature_url, feature)
    feature = ngw_webtest_app.get(feature_url).json
    assert wkt_compare(feature['geom'], 'POINT (1.0 0.0)')

    feature['geom'] = dict(type='Point', coordinates=[1, 2])
    ngw_webtest_app.put_json(feature_url + '?geom_format=geojson', feature)
    assert feature == ngw_webtest_app.get(feature_url + '?geom_format=geojson').json

    feature = ngw_webtest_app.get(feature_url).json
    assert wkt_compare(feature['geom'], 'POINT (1.0 2.0)')

    feature['geom'] = dict(type='Point', coordinates=[90, 45])
    ngw_webtest_app.put_json(feature_url + '?geom_format=geojson&srs=4326', feature)
    feature = ngw_webtest_app.get(feature_url + '?geom_format=geojson&srs=3857').json
    coords = feature['geom']['coordinates']
    assert round(coords[0], 3) == 10018754.171
    assert round(coords[1], 3) == 5621521.486


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


@pytest.mark.parametrize('fmt, zipped, srs', product(
    EXPORT_FORMAT_OGR.keys(), ('true', 'false'), (4326, 3857)
))
def test_export(fmt, zipped, srs, ngw_webtest_app, vector_layer_id, ngw_auth_administrator):
    ngw_webtest_app.get('/api/resource/%d/export' % vector_layer_id,
                        dict(format=fmt, zipped=zipped, srs=srs), status=200)


@pytest.mark.parametrize('extent, simplification, padding', (
    (4096, 6.5, 0.1),
    (2048, 4.1, 0.01),
))
def test_mvt(extent, simplification, padding, ngw_webtest_app, vector_layer_id, ngw_auth_administrator):
    params = dict(z=0, x=0, y=0, resource=vector_layer_id,
                  extent=extent, simplification=simplification, padding=padding)
    ngw_webtest_app.get('/api/component/feature_layer/mvt', params, status=200)


@pytest.mark.parametrize('mvt_driver_exist, status_expected', (
    (True, 200),
    (False, 404),
))
def test_mvt_should_return_not_found_if_mvt_driver_not_available(mvt_driver_exist, status_expected, ngw_webtest_app, vector_layer_id, ngw_auth_administrator):
    import nextgisweb.feature_layer.ogrdriver as ogrdriver
    old_MVT_DRIVER_EXIST = ogrdriver.MVT_DRIVER_EXIST
    ogrdriver.MVT_DRIVER_EXIST = mvt_driver_exist

    import nextgisweb.feature_layer.api as api
    importlib.reload(api)

    params = dict(z=0, x=0, y=0, resource=vector_layer_id,
                  extent=2048, simplification=4.1, padding=0.1)
    ngw_webtest_app.get('/api/component/feature_layer/mvt', params, status=status_expected)

    ogrdriver.MVT_DRIVER_EXIST = old_MVT_DRIVER_EXIST
    importlib.reload(api)


def test_filter(ngw_webtest_app, vector_layer_id, ngw_auth_administrator):
    url = '/api/resource/%d/feature/' % vector_layer_id

    resp = ngw_webtest_app.get(url, dict(fld_price__ge=-1), status=200)
    assert len(resp.json) == 1
    assert resp.json[0]['fields']['price'] == -1

    ngw_webtest_app.get(url, dict(fld_not_exists='no matter'), status=422)


def test_cdelete(ngw_webtest_app, vector_layer_id, ngw_auth_administrator):
    url = '/api/resource/%d/feature/' % vector_layer_id

    resp = ngw_webtest_app.delete_json(url, [])
    assert resp.json == []

    resp = ngw_webtest_app.delete_json(url, [dict(id=1)])
    assert resp.json == [1]

    resp = ngw_webtest_app.delete(url)
    assert resp.json

    assert ngw_webtest_app.get(url).json == []
