import json
from uuid import uuid4

import pytest
from osgeo import ogr
import transaction
import xml.etree.ElementTree as ET

from nextgisweb.auth import User
from nextgisweb.models import DBSession
from nextgisweb.spatial_ref_sys import SRS
from nextgisweb.vector_layer import VectorLayer


@pytest.fixture(scope='module')
def vector_layer_id(ngw_resource_group):
    with transaction.manager:
        obj = VectorLayer(
            parent_id=ngw_resource_group, display_name='test_wfs_vector_layer',
            owner_user=User.by_keyname('administrator'),
            srs=SRS.filter_by(id=3857).one(),
            tbl_uuid=uuid4().hex,
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
                'geometry': {'type': 'Point', 'coordinates': [10, 10]}
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


def test_api(vector_layer_id, ngw_webtest_app, ngw_auth_administrator, ngw_resource_group):
    data = dict(
        resource=dict(
            cls='wfsserver_service', display_name="test_wfs",
            parent=dict(id=ngw_resource_group)),
        wfsserver_service=dict(layers=[dict(
            keyname="points",
            display_name="points",
            resource_id=vector_layer_id,
            maxfeatures=1000
        )])
    )
    resp = ngw_webtest_app.post_json('/api/resource/', data, status=201)
    wfsserver_service_id = resp.json['id']

    resp = ngw_webtest_app.get('/api/resource/%d/wfs' % wfsserver_service_id, dict(
        service='wfs', request='GetCapabilities',
    ), status=200)

    ET.fromstring(resp.text.encode('utf-8'))

    ngw_webtest_app.delete('/api/resource/%d' % wfsserver_service_id, status=200)
