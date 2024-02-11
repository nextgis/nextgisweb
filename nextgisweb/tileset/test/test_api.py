import pytest

pytestmark = pytest.mark.usefixtures("ngw_resource_defaults", "ngw_auth_administrator")


@pytest.mark.parametrize(
    "filename, checks",
    (
        (
            "maperitive-mbtiles-holmsk.mbtiles",
            ((4, 14, 5), (8, 228, 90)),
        ),
        (
            "maperitive-tiles-holmsk.zip",
            ((4, 14, 5), (8, 228, 90)),
        ),
    ),
)
def test_tileset(
    filename,
    checks,
    ngw_resource_group,
    ngw_data_path,
    ngw_file_upload,
    ngw_webtest_app,
):
    resp = ngw_webtest_app.post_json(
        "/api/resource/",
        dict(
            resource=dict(
                cls="tileset",
                display_name=f"test-{filename}",
                parent=dict(id=ngw_resource_group),
            ),
            tileset=dict(
                source=ngw_file_upload(ngw_data_path / filename),
                srs=dict(id=3857),
            ),
        ),
        status=201,
    )
    resource_id = resp.json["id"]

    for z, x, y in checks:
        ngw_webtest_app.get(
            "/api/component/render/tile",
            dict(
                resource=resource_id,
                z=z,
                x=x,
                y=y,
                nd=204,
            ),
            status=200,
        )
