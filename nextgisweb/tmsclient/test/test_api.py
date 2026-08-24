from unittest.mock import MagicMock, patch

import pytest
import transaction
from requests.exceptions import ConnectionError, HTTPError, JSONDecodeError

from nextgisweb.pyramid.test import WebTestApp

from ..model import NEXTGIS_GEOSERVICES, TMSConnection

pytestmark = pytest.mark.usefixtures("ngw_resource_defaults", "ngw_auth_administrator")


@pytest.fixture
def connection_id():
    with transaction.manager:
        resource = TMSConnection(
            url_template="https://geoservices.nextgis.com/raster/{layer}/{z}/{x}/{y}.png",
            capmode=NEXTGIS_GEOSERVICES,
        ).persist()
    return resource.id


def inspect(ngw_webtest_app: WebTestApp, connection_id):
    return ngw_webtest_app.get(f"/api/resource/{connection_id}/tmsclient/inspect", status=503)


def test_inspect_http_error(connection_id, ngw_webtest_app: WebTestApp):
    response = MagicMock(
        status_code=500,
        headers={"Content-Type": "application/json"},
    )
    response.raise_for_status.side_effect = HTTPError("500 Server Error")

    with patch("nextgisweb.tmsclient.api.requests.get", return_value=response):
        res = inspect(ngw_webtest_app, connection_id)

    assert "(500)" in res.json["message"]
    assert res.json["data"]["status_code"] == 500


def test_inspect_request_exception(connection_id, ngw_webtest_app: WebTestApp):
    with patch("nextgisweb.tmsclient.api.requests.get", side_effect=ConnectionError("simulated")):
        res = inspect(ngw_webtest_app, connection_id)

    assert "Unable to get a response" in res.json["message"]
    assert res.json["detail"] == "ConnectionError."
    assert "simulated" not in res.text


def test_inspect_invalid_json(connection_id, ngw_webtest_app: WebTestApp):
    response = MagicMock(
        status_code=200,
        headers={"Content-Type": "text/html"},
    )
    response.json.side_effect = JSONDecodeError("Expecting value", "<html>", 0)

    with patch("nextgisweb.tmsclient.api.requests.get", return_value=response):
        res = inspect(ngw_webtest_app, connection_id)

    assert "Failed to parse the JSON response" in res.json["message"]
    assert res.json["data"]["content_type"] == "text/html"
