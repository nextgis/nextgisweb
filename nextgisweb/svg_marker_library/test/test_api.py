from secrets import token_hex

import pytest

pytestmark = pytest.mark.usefixtures("ngw_auth_administrator")


@pytest.mark.parametrize(
    "name, ok",
    (
        ("not-svg.svg", False),
        ("example.svg", True),
        ("example-utf8-bom.svg", True),
    ),
)
def test_create(name, ok, ngw_resource_group, ngw_webtest_app, ngw_data_path, ngw_file_upload):
    svg = ngw_data_path / name
    meta = ngw_file_upload(svg)
    meta["name"] = name

    body = dict(
        resource=dict(
            cls="svg_marker_library",
            parent=dict(id=ngw_resource_group),
            display_name=token_hex(8),
        ),
        svg_marker_library=dict(files=[meta]),
    )

    resp = ngw_webtest_app.post_json("/api/resource/", body, status=201 if ok else 422)

    if not ok:
        return

    resource_id = resp.json["id"]
    resp = ngw_webtest_app.get(f"/api/resource/{resource_id}/file/{name}", status=200)

    assert resp.body == svg.read_bytes()
