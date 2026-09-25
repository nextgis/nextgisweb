from base64 import b64encode

import pytest

from nextgisweb.pyramid.test import WebTestApp
from nextgisweb.resource.test import ResourceAPI

from .test_api import fake_copc

pytestmark = pytest.mark.usefixtures("ngw_resource_defaults", "ngw_administrator_password")

BASIC = {"Authorization": "Basic " + b64encode(b"administrator:admin").decode()}


@pytest.fixture
def layer_id(ngw_webtest_app: WebTestApp, ngw_resource_group):
    upload = ngw_webtest_app.put(
        "/api/component/file_upload/", data=b"copc-content", headers=BASIC
    )

    with fake_copc():
        yield ResourceAPI(ngw_webtest_app).create(
            "point_cloud_layer",
            {
                "resource": {"parent": {"id": ngw_resource_group}},
                "point_cloud_layer": {"source": upload.json},
            },
            headers=BASIC,
        )


def test_copc_guest_challenge(layer_id, ngw_webtest_app: WebTestApp):
    # Clients like QGIS send credentials embedded in the URL only after a challenge
    url = f"/api/resource/{layer_id}/point_cloud.copc.laz"

    for method in (ngw_webtest_app.head, ngw_webtest_app.get):
        resp = method(url, status=401)
        assert resp.headers["WWW-Authenticate"].startswith("Basic")

    resp = ngw_webtest_app.get(url, headers={**BASIC, "Range": "bytes=0-3"}, status=206)
    assert resp.body == b"copc"
