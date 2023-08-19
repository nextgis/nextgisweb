import json

import pytest
import transaction

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
def service_id():
    with transaction.manager:
        geojson = {
            "type": "FeatureCollection",
            "crs": {"type": "name", "properties": {"name": "urn:ogc:def:crs:EPSG::3857"}},
            "features": [
                {
                    "type": "Feature",
                    "properties": {"name": "feature1"},
                    "geometry": {"type": "Point", "coordinates": [0, 0]},
                },
                {
                    "type": "Feature",
                    "properties": {"price": -1},
                    "geometry": {"type": "Point", "coordinates": [10, 10]},
                },
            ],
        }

        res_vl = VectorLayer().persist().from_ogr(json.dumps(geojson))
        DBSession.flush()

        res_wfs = WFSService().persist()
        res_wfs.layers.append(
            WFSLayer(
                resource=res_vl,
                keyname="test",
                display_name="test",
                maxfeatures=1000,
            )
        )

        DBSession.flush()

    yield res_wfs.id


XML_VALID_FIXTURES = []
for version in TEST_WFS_VERSIONS:
    XML_VALID_FIXTURES.extend(
        (
            pytest.param(
                version,
                dict(request="GetCapabilities"),
                id="{}-GetCapabilities".format(version),
            ),
            pytest.param(
                version,
                dict(request="DescribeFeatureType"),
                id="{}-DescribeFeatureType".format(version),
            ),
            pytest.param(
                version,
                dict(request="GetFeature", typenames="test"),
                id="{}-GetFeature".format(version),
            ),
        )
    )


@pytest.mark.parametrize("version, query", XML_VALID_FIXTURES)
def test_schema(version, query, service_id, ngw_webtest_app):
    query["VERSION"] = version
    query["VALIDATESCHEMA"] = "1"
    ngw_webtest_app.get("/api/resource/%d/wfs" % service_id, query, status=200)
