import json

import pytest
import transaction
from osgeo import gdal, ogr

from nextgisweb.env import DBSession

from nextgisweb.vector_layer import VectorLayer

from ..model import Layer as WFSLayer
from ..model import Service as WFSService

pytestmark = pytest.mark.usefixtures("ngw_resource_defaults", "ngw_auth_administrator")

TEST_WFS_VERSIONS = (
    "2.0.2",
    "2.0.0",
    "1.1.0",
    "1.0.0",
)


@pytest.fixture(scope="module", autouse=True)
def force_schema_validation(ngw_env):
    with ngw_env.wfsserver.force_schema_validation():
        yield


@pytest.fixture(scope="module")
def vlayer_id():
    with transaction.manager:
        geojson = {
            "type": "FeatureCollection",
            "crs": {"type": "name", "properties": {"name": "urn:ogc:def:crs:EPSG::3857"}},
            "features": [
                {
                    "type": "Feature",
                    "properties": {
                        "field1": 1,
                        "поле2": "значение1",
                        "!field3": "!@#$%^&*()значение1",
                    },
                    "geometry": {"type": "Point", "coordinates": [0, 0]},
                },
                {
                    "type": "Feature",
                    "properties": {
                        "field1": 2,
                        "поле2": "значение2",
                        "!field3": "!@#$%^&*()значение2",
                    },
                    "geometry": {"type": "Point", "coordinates": [10, 10]},
                },
            ],
        }

        res_vl = VectorLayer().persist().from_ogr(json.dumps(geojson))
        DBSession.flush()

    yield res_vl.id


@pytest.fixture(scope="module")
def service_id(vlayer_id):
    with transaction.manager:
        res_wfs = WFSService().persist()
        res_wfs.layers.append(
            WFSLayer(
                resource_id=vlayer_id,
                keyname="test",
                display_name="test",
                maxfeatures=1000,
            )
        )

        DBSession.flush()

    yield res_wfs.id


def test_cyrillic(service_id, vlayer_id, ngw_httptest_app):
    driver = ogr.GetDriverByName("WFS")
    wfs_ds = driver.Open(f"WFS:{ngw_httptest_app.base_url}/api/resource/{service_id}/wfs", True)

    assert wfs_ds is not None, gdal.GetLastErrorMsg()

    layer = wfs_ds.GetLayer(0)

    defn = layer.GetLayerDefn()
    assert defn.GetFieldCount() == 4

    field_idxs = list(range(defn.GetFieldCount()))
    field_idxs.remove(defn.GetGeomFieldIndex("geom"))
    field_idxs.remove(defn.GetFieldIndex("field1"))
    field_idxs.remove(defn.GetFieldIndex("поле2"))
    assert len(field_idxs) == 1

    field = defn.GetFieldDefn(field_idxs[0])
    name = field.GetName()
    assert name.startswith("wfsfld_")

    feature = layer.GetFeature(1)
    value = "test value!"
    feature.SetField(name, value)

    err = layer.SetFeature(feature)
    assert err == 0, gdal.GetLastErrorMsg()

    feature_cmp = ngw_httptest_app.get("/api/resource/%s/feature/1" % vlayer_id).json()
    assert feature_cmp["fields"]["!field3"] == value
