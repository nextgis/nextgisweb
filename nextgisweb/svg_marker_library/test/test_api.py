import pytest

from nextgisweb.pyramid.test import WebTestApp
from nextgisweb.resource.test import ResourceAPI

pytestmark = pytest.mark.usefixtures("ngw_auth_administrator")


@pytest.mark.parametrize(
    "name, ok",
    (
        ("not-svg.svg", False),
        ("example.svg", True),
        ("example-utf8-bom.svg", True),
    ),
)
@pytest.mark.usefixtures("ngw_resource_group")
def test_create(name, ok, ngw_webtest_app: WebTestApp, ngw_data_path, ngw_file_upload):
    rapi = ResourceAPI()
    svg = ngw_data_path / name
    meta = ngw_file_upload(svg)
    meta["name"] = name

    resp = rapi.create_request(
        "svg_marker_library",
        {"svg_marker_library": {"files": [meta]}},
        status=201 if ok else 422,
    )

    if not ok:
        return

    resp = ngw_webtest_app.get(rapi.item_url(resp.json["id"], f"file/{name}"), status=200)
    assert resp.body == svg.read_bytes()
