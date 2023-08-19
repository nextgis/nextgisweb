import json
import xml.etree.ElementTree as ET

import pytest
import transaction

from nextgisweb.env import DBSession

from nextgisweb.vector_layer import VectorLayer

pytestmark = pytest.mark.usefixtures("ngw_resource_defaults", "ngw_auth_administrator")


@pytest.fixture(scope="module")
def vector_layer_id():
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

        obj = VectorLayer().persist().from_ogr(json.dumps(geojson))
        DBSession.flush()

    yield obj.id


def test_api(vector_layer_id, ngw_webtest_app, ngw_resource_group):
    data = dict(
        resource=dict(
            cls="wfsserver_service", display_name="test_wfs", parent=dict(id=ngw_resource_group)
        ),
        wfsserver_service=dict(
            layers=[
                dict(
                    keyname="points",
                    display_name="points",
                    resource_id=vector_layer_id,
                    maxfeatures=1000,
                )
            ]
        ),
    )
    resp = ngw_webtest_app.post_json("/api/resource/", data, status=201)
    wfsserver_service_id = resp.json["id"]

    resp = ngw_webtest_app.get(
        "/api/resource/%d/wfs" % wfsserver_service_id,
        dict(service="wfs", request="GetCapabilities"),
        status=200,
    )

    ET.fromstring(resp.text.encode("utf-8"))

    ngw_webtest_app.delete("/api/resource/%d" % wfsserver_service_id, status=200)
