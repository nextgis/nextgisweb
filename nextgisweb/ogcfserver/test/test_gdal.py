import pytest
import transaction
from osgeo import gdal, gdalconst

from nextgisweb.vector_layer import VectorLayer

from ..model import Collection, Service

pytestmark = pytest.mark.usefixtures("ngw_resource_defaults")


@pytest.fixture(scope="module")
def vlayer_id(ngw_resource_group, ngw_data_path):
    with transaction.manager:
        obj = VectorLayer().persist()
        obj.from_ogr(ngw_data_path / "ne_110m_populated_places.geojson")

    yield obj.id


@pytest.fixture(scope="module")
def service_id(vlayer_id, ngw_resource_group):
    with transaction.manager:
        obj = Service(
            collections=[
                Collection(
                    resource_id=vlayer_id,
                    keyname="test",
                    display_name="test",
                    maxfeatures=10,
                ),
            ],
        ).persist()

    yield obj.id


def test_read(service_id, ngw_httptest_app, ngw_auth_administrator):
    url = "{}/api/resource/{}/ogcf".format(ngw_httptest_app.base_url, service_id)

    ds = gdal.OpenEx(f"OAPIF:{url}", gdalconst.GA_ReadOnly)
    assert ds.GetLayerCount() == 1

    collection = ds.GetLayerByIndex(0)
    assert collection.GetName() == "test"
    assert collection.GetFeatureCount() == 20
