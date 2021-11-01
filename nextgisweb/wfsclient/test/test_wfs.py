from pathlib import Path
from uuid import uuid4

import pytest
import transaction
from osgeo import gdal, ogr
from shapely import affinity
from shapely.geometry import Polygon

from nextgisweb.auth import User
from nextgisweb.models import DBSession
from nextgisweb.spatial_ref_sys import SRS
from nextgisweb.vector_layer import VectorLayer
from nextgisweb.wfsclient.model import WFSConnection, WFSLayer
from nextgisweb.wfsserver.model import Layer as WFS_Service_Layer, Service as WFSService


TEST_WFS_VERSIONS = ('2.0.2', '2.0.0', )


@pytest.fixture(scope='module', autouse=True)
def skip(ngw_env):
    if not ngw_env.options.get('component.wfsclient'):
        pytest.skip("wmsclient is not available")
    yield


def type_geojson_dataset(filename):
    import nextgisweb.vector_layer.test
    path = Path(nextgisweb.vector_layer.test.__file__).parent / 'data' / filename
    result = ogr.Open(str(path))
    assert result is not None, gdal.GetLastErrorMsg()
    return result


@pytest.fixture
def wfs_service_path(ngw_resource_group, ngw_httptest_app):
    with transaction.manager:
        vl_type = VectorLayer(
            parent_id=ngw_resource_group, display_name='type',
            owner_user=User.by_keyname('administrator'),
            srs=SRS.filter_by(id=3857).one(),
            tbl_uuid=uuid4().hex,
        ).persist()

        dsource = type_geojson_dataset('type.geojson')
        layer = dsource.GetLayer(0)

        vl_type.setup_from_ogr(layer)
        vl_type.load_from_ogr(layer)

        DBSession.flush()

        # NOTE: GDAL doesn't support time fields in GML / WFS. It completely breaks
        # XSD schema parsing. Delete the time field to pass tests.
        DBSession.delete(vl_type.field_by_keyname('time'))

        wfs_service = WFSService(
            parent_id=ngw_resource_group, display_name='test_wfsserver_service',
            owner_user=User.by_keyname('administrator'),
        ).persist()
        wfs_service.layers.append(
            WFS_Service_Layer(
                resource=vl_type, keyname='type',
                display_name='type', maxfeatures=1000)
        )

        DBSession.flush()

        DBSession.expunge(vl_type)
        DBSession.expunge(wfs_service)

    path = '{}/api/resource/{}/wfs'.format(ngw_httptest_app.base_url, wfs_service.id)
    yield path

    with transaction.manager:
        DBSession.delete(VectorLayer.filter_by(id=vl_type.id).one())
        DBSession.delete(WFSService.filter_by(id=wfs_service.id).one())


@pytest.fixture
def connection_id(ngw_resource_group, wfs_service_path):
    with transaction.manager:
        admin = User.by_keyname('administrator')
        obj = WFSConnection(
            parent_id=ngw_resource_group, display_name='wfs_connection',
            owner_user=admin, path=wfs_service_path,
            username='administrator', password='admin',
            version='2.0.2'
        ).persist()

    yield obj.id

    with transaction.manager:
        DBSession.delete(WFSConnection.filter_by(id=obj.id).one())


@pytest.fixture
def layer_id(ngw_resource_group, connection_id):
    with transaction.manager:
        admin = User.by_keyname('administrator')
        obj = WFSLayer(
            parent_id=ngw_resource_group, display_name='wfs_layer',
            owner_user=admin, srs_id=3857, connection_id=connection_id,
            layer_name='type', column_geom='geom', geometry_srid=3857,
            geometry_type='POINT'
        ).persist()

        DBSession.flush()
        obj.setup()

    yield obj.id

    with transaction.manager:
        DBSession.delete(WFSLayer.filter_by(id=obj.id).one())


def test_connection(connection_id, ngw_webtest_app, ngw_auth_administrator):
    res = ngw_webtest_app.get('/api/resource/%d/wfs_connection/inspect/' % connection_id)
    assert res.json == [dict(name='type', srid=3857)]

    ngw_webtest_app.get('/api/resource/%d/wfs_connection/inspect/%s/' % (
        connection_id, 'type'), status=200)


def test_layer(layer_id, ngw_webtest_app, ngw_auth_administrator):
    layer_url = '/api/resource/%d' % layer_id

    res = ngw_webtest_app.get('%s/feature/1' % layer_url, dict(geom_format='geojson'))
    feature = res.json

    # Intersects
    x, y = feature['geom']['coordinates']

    poly = Polygon((
        (x - 1, y - 1), (x - 1, y + 1),
        (x + 1, y + 1), (x + 1, y - 1),
    ))

    res = ngw_webtest_app.get('%s/feature/' % layer_url, dict(
        geom_format='geojson', intersects=poly.wkt))
    assert res.json == [feature]

    poly = affinity.translate(poly, 5, 5)

    res = ngw_webtest_app.get('%s/feature/' % layer_url, dict(
        geom_format='geojson', intersects=poly.wkt))
    assert len(res.json) == 0

    # Limit, offset
    res = ngw_webtest_app.get('%s/feature/' % layer_url, dict(
        geom_format='geojson', limit=0))
    assert len(res.json) == 0

    res = ngw_webtest_app.get('%s/feature/' % layer_url, dict(
        geom_format='geojson', limit=1, offset=1))
    assert len(res.json) == 0

    res = ngw_webtest_app.get('%s/feature/' % layer_url, dict(
        geom_format='geojson', limit=1, offset=0))
    assert res.json == [feature]
