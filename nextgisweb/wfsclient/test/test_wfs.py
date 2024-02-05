from pathlib import Path

import pytest
import transaction
from shapely import affinity
from shapely.geometry import Polygon

from nextgisweb.env import DBSession

from nextgisweb.vector_layer import VectorLayer
from nextgisweb.vector_layer import test as vector_layer_test
from nextgisweb.wfsserver.model import Layer as WFS_Service_Layer
from nextgisweb.wfsserver.model import Service as WFSService

from ..model import WFSConnection, WFSLayer

pytestmark = pytest.mark.usefixtures("ngw_resource_defaults", "ngw_auth_administrator")

TEST_WFS_VERSIONS = ("2.0.2", "2.0.0")
DATA = Path(vector_layer_test.__file__).parent / "data"


@pytest.fixture
def wfs_service_path(ngw_httptest_app):
    with transaction.manager:
        vl_type = VectorLayer().persist().from_ogr(DATA / "type.geojson")

        DBSession.flush()

        # NOTE: GDAL doesn't support time fields in GML / WFS. It completely breaks
        # XSD schema parsing. Delete the time field to pass tests.
        DBSession.delete(vl_type.field_by_keyname("time"))

        wfs_service = WFSService().persist()
        wfs_service.layers.append(
            WFS_Service_Layer(
                resource=vl_type, keyname="type", display_name="type", maxfeatures=1000
            )
        )

        DBSession.flush()

        DBSession.expunge(vl_type)
        DBSession.expunge(wfs_service)

    path = "{}/api/resource/{}/wfs".format(ngw_httptest_app.base_url, wfs_service.id)
    yield path


@pytest.fixture
def connection_id(wfs_service_path):
    with transaction.manager:
        obj = WFSConnection(
            path=wfs_service_path, username="administrator", password="admin", version="2.0.2"
        ).persist()

    yield obj.id


@pytest.fixture
def layer_id(connection_id):
    with transaction.manager:
        obj = WFSLayer(
            srs_id=3857,
            connection_id=connection_id,
            layer_name="type",
            column_geom="geom",
            geometry_srid=3857,
            geometry_type="POINT",
        ).persist()

        DBSession.flush()
        obj.setup()

    yield obj.id


def test_connection(connection_id, ngw_webtest_app):
    res = ngw_webtest_app.get("/api/resource/%d/wfs_connection/inspect/" % connection_id)
    assert res.json == [dict(name="type", srid=3857, bbox=[0.0, 0.0, 131.89371, 43.11047])]

    ngw_webtest_app.get(
        "/api/resource/%d/wfs_connection/inspect/%s/" % (connection_id, "type"), status=200
    )


def test_layer(layer_id, ngw_webtest_app):
    layer_url = "/api/resource/%d" % layer_id

    feature1 = ngw_webtest_app.get("%s/feature/1" % layer_url, dict(geom_format="geojson")).json
    feature2 = ngw_webtest_app.get("%s/feature/2" % layer_url, dict(geom_format="geojson")).json

    # Intersects
    x, y = feature1["geom"]["coordinates"]

    poly = Polygon(
        (
            (x - 1, y - 1),
            (x - 1, y + 1),
            (x + 1, y + 1),
            (x + 1, y - 1),
        )
    )

    res = ngw_webtest_app.get(
        "%s/feature/" % layer_url,
        dict(geom_format="geojson", intersects=poly.wkt),
    )
    assert res.json == [feature1]

    poly = affinity.translate(poly, 5, 5)

    res = ngw_webtest_app.get(
        "%s/feature/" % layer_url,
        dict(geom_format="geojson", intersects=poly.wkt),
    )
    assert len(res.json) == 0

    # Limit, offset
    res = ngw_webtest_app.get(
        "%s/feature/" % layer_url,
        dict(geom_format="geojson", limit=0),
    )
    assert len(res.json) == 0

    res = ngw_webtest_app.get(
        "%s/feature/" % layer_url,
        dict(geom_format="geojson", limit=1, offset=1),
    )
    assert res.json == [feature2]

    res = ngw_webtest_app.get(
        "%s/feature/" % layer_url,
        dict(geom_format="geojson", limit=1, offset=0),
    )
    assert res.json == [feature1]
