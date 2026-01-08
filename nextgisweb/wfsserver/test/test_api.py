import json
import xml.etree.ElementTree as ET

import pytest
import transaction

from nextgisweb.pyramid.test import WebTestApp
from nextgisweb.resource.test import ResourceAPI
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

    yield obj.id


def test_api(vector_layer_id, ngw_webtest_app: WebTestApp):
    rapi = ResourceAPI()
    res_id = rapi.create(
        "wfsserver_service",
        {
            "wfsserver_service": {
                "layers": [
                    {
                        "keyname": "points",
                        "display_name": "points",
                        "resource_id": vector_layer_id,
                        "maxfeatures": 1000,
                    },
                ],
            },
        },
    )

    resp = ngw_webtest_app.get(
        rapi.item_url(res_id, "wfs"),
        query=dict(service="wfs", request="GetCapabilities"),
        status=200,
    )

    ET.fromstring(resp.text.encode("utf-8"))
