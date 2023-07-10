from pathlib import Path
from uuid import uuid4

import pytest
import transaction
from osgeo import gdal, gdalconst

from nextgisweb.env import DBSession

from nextgisweb.auth import User
from nextgisweb.spatial_ref_sys import SRS
from nextgisweb.vector_layer import VectorLayer

from ..model import Collection, Service

DATA_PATH = Path(__file__).parent / 'data'


@pytest.fixture(scope='module')
def vlayer_id(ngw_resource_group):
    with transaction.manager:
        res_vl = VectorLayer(
            parent_id=ngw_resource_group, display_name='Vector layer',
            owner_user=User.by_keyname('administrator'),
            srs=SRS.filter_by(id=3857).one(),
            tbl_uuid=uuid4().hex,
        ).persist().from_ogr(DATA_PATH / 'ne_110m_populated_places.geojson')

        DBSession.flush()

        DBSession.expunge(res_vl)

    yield res_vl.id

    with transaction.manager:
        DBSession.delete(VectorLayer.filter_by(id=res_vl.id).one())


@pytest.fixture(scope='module')
def service_id(vlayer_id, ngw_resource_group):
    with transaction.manager:
        res_service = Service(
            parent_id=ngw_resource_group, display_name='Service',
            owner_user=User.by_keyname('administrator'),
        ).persist()

        res_service.collections.append(Collection(
            resource_id=vlayer_id, keyname='test',
            display_name='test', maxfeatures=10,
        ))

        DBSession.flush()

        DBSession.expunge(res_service)

    yield res_service.id

    with transaction.manager:
        DBSession.delete(Service.filter_by(id=res_service.id).one())


def test_read(service_id, ngw_httptest_app, ngw_auth_administrator):
    url = "{}/api/resource/{}/ogcf".format(ngw_httptest_app.base_url, service_id)

    ds = gdal.OpenEx(f"OAPIF:{url}", gdalconst.GA_ReadOnly)
    assert ds.GetLayerCount() == 1

    collection = ds.GetLayerByIndex(0)
    assert collection.GetName() == 'test'
    assert collection.GetFeatureCount() == 20
