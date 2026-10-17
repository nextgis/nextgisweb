from secrets import token_hex

import pytest

from nextgisweb.pyramid.test import WebTestApp


@pytest.mark.parametrize(
    "filename, checks",
    (
        pytest.param("tileset.mbtiles", {"expected": {"zmin": 0, "zmax": 11}}, id="mbtiles"),
        pytest.param("tileset.zip", {"expected": {"zmin": 0, "zmax": 11}}, id="zip"),
        pytest.param("subdir.zip", {"expected": {"zmin": 0, "zmax": 2}}, id="zip-subdir"),
        pytest.param("two-subdir.zip", {"ok": False}, id="zip-differend-subdir"),
    ),
)
def test_create(
    filename,
    checks,
    ngw_data_path,
    ngw_resource_group,
    ngw_webtest_app: WebTestApp,
    ngw_file_upload,
    ngw_auth_administrator,
):
    upload_meta = ngw_file_upload(ngw_data_path / filename)

    data = {
        "resource": {
            "cls": "tileset",
            "display_name": token_hex(),
            "parent": {"id": ngw_resource_group},
        },
        "tileset": {"srs": {"id": 3857}, "source": upload_meta},
    }
    ok = checks.get("ok", True)
    resp = ngw_webtest_app.post("/api/resource/", json=data, status=201 if ok else 422)
    if not ok:
        return

    tileset_id = resp.json["id"]

    resp = ngw_webtest_app.get(f"/api/resource/{tileset_id}", status=200)
    actual = resp.json["tileset"]
    expected = checks["expected"]

    for k, v in expected.items():
        assert actual[k] == v
