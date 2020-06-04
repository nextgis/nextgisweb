# -*- coding: utf-8 -*-
from __future__ import division, absolute_import, print_function, unicode_literals

import json
import pytest
import six
import transaction
import webtest

from uuid import uuid4
from osgeo import ogr

from nextgisweb.auth import User
from nextgisweb.models import DBSession
from nextgisweb.spatial_ref_sys.models import SRS
from nextgisweb.vector_layer import VectorLayer


def test_identify(env, webapp):
    data = {
        'srs': 3857,
        'geom': 'POLYGON((0 0,0 1,1 1,1 0,0 0))',
        'layers': []
    }
    resp = webapp.post_json('/api/feature_layer/identify', data, status=200)
    assert resp.json['featureCount'] == 0


@pytest.fixture(scope='module')
def vector_layer_id():
    with transaction.manager:

        obj = VectorLayer(
            parent_id=0, display_name='vector_layer',
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


def test_fields_edit(webapp, vector_layer_id):
    webapp.authorization = ('Basic', ('administrator', 'admin'))

    resp = webapp.get('/api/resource/%d' % vector_layer_id)
    fields = resp.json['feature_layer']['fields']

    assert len(fields) == 2

    resp = webapp.get('/api/resource/%d/feature/1' % vector_layer_id)
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
    webapp.put_json('/api/resource/%d' % vector_layer_id, {
        'feature_layer': {'fields': fields}
    }, status=200)
    resp = webapp.get('/api/resource/%d/feature/1' % vector_layer_id)
    feature_fields = resp.json['fields']

    assert len(feature_fields) == 3

    resp = webapp.get('/api/resource/%d' % vector_layer_id)
    fields = resp.json['feature_layer']['fields']

    assert len(fields) == 3

    fields = [fields[2], fields[0]]
    webapp.put_json('/api/resource/%d' % vector_layer_id, {
        'feature_layer': {'fields': fields}
    }, status=200)
    resp = webapp.get('/api/resource/%d' % vector_layer_id)
    fields = resp.json['feature_layer']['fields']

    assert len(fields) == 3
    assert fields[0]['keyname'] == 'new_field'
    assert fields[1]['keyname'] == 'name'
    assert fields[2]['keyname'] == 'price'

    fields[2]['deleted'] = True
    webapp.put_json('/api/resource/%d' % vector_layer_id, {
        'feature_layer': {'fields': fields}
    }, status=200)
    resp = webapp.get('/api/resource/%d' % vector_layer_id)
    fields = resp.json['feature_layer']['fields']

    assert len(fields) == 2
