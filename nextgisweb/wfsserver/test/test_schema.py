
import json
from uuid import uuid4

import pytest
import transaction
from osgeo import ogr

from nextgisweb.auth import User
from nextgisweb.models import DBSession
from nextgisweb.spatial_ref_sys import SRS
from nextgisweb.vector_layer import VectorLayer
from nextgisweb.wfsserver.model import Service as WFSService, Layer as WFSLayer


TEST_WFS_VERSIONS = ('2.0.2', '2.0.0', '1.1.0', '1.0.0', )


@pytest.fixture(scope='module', autouse=True)
def force_schema_validation(ngw_env):
    with ngw_env.wfsserver.force_schema_validation():
        yield


@pytest.fixture(scope='module')
def service_id(ngw_resource_group):
    with transaction.manager:
        res_vl = VectorLayer(
            parent_id=ngw_resource_group, display_name='test_vector_layer',
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

        res_vl.setup_from_ogr(layer)
        res_vl.load_from_ogr(layer)

        DBSession.flush()

        res_wfs = WFSService(
            parent_id=ngw_resource_group, display_name='test_wfsserver_service',
            owner_user=User.by_keyname('administrator'),
        ).persist()

        res_wfs.layers.append(WFSLayer(
            resource=res_vl, keyname='test',
            display_name='test', maxfeatures=1000,
        ))

        DBSession.flush()

        DBSession.expunge(res_vl)
        DBSession.expunge(res_wfs)

    yield res_wfs.id

    with transaction.manager:
        DBSession.delete(VectorLayer.filter_by(id=res_vl.id).one())
        DBSession.delete(WFSService.filter_by(id=res_wfs.id).one())


XML_VALID_FIXTURES = []
for version in TEST_WFS_VERSIONS:
    XML_VALID_FIXTURES.extend((
        pytest.param(
            version, dict(request='GetCapabilities'),
            id='{}-GetCapabilities'.format(version)),
        pytest.param(
            version, dict(request='DescribeFeatureType'),
            id='{}-DescribeFeatureType'.format(version)),
        pytest.param(
            version, dict(request='GetFeature', typenames='test'),
            id='{}-GetFeature'.format(version)),
    ))


@pytest.mark.parametrize('version, query', XML_VALID_FIXTURES)
def test_schema(version, query, service_id, ngw_webtest_app, ngw_auth_administrator):
    query['VERSION'] = version
    query['VALIDATESCHEMA'] = '1'
    ngw_webtest_app.get('/api/resource/%d/wfs' % service_id, query, status=200)
