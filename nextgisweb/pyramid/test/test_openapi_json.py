from unittest.mock import ANY

from nextgisweb.pyramid.test import WebTestApp


def test_openapi_json(ngw_webtest_app: WebTestApp):
    data = ngw_webtest_app.get("/openapi.json", status=200).json
    # TODO: Add more validation
    assert data == {
        "openapi": "3.1.0",
        "info": ANY,
        "paths": ANY,
        "components": ANY,
    }
