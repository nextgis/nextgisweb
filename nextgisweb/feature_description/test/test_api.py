import pytest
import transaction

from nextgisweb.vector_layer import VectorLayer

pytestmark = pytest.mark.usefixtures("ngw_resource_defaults", "ngw_auth_administrator")


@pytest.fixture(scope="module")
def layer_id():
    with transaction.manager:
        res = VectorLayer(geometry_type="POINT").persist()
        res.setup_from_fields([])

    yield res.id


def test_create(layer_id, ngw_webtest_app):
    description = "<p>Some feature description</p>"
    API_URL = f"/api/resource/{layer_id}/feature/"

    resp = ngw_webtest_app.post_json(
        API_URL,
        dict(geom="POINT (0 0)", extensions=dict(description=description)),
        status=200,
    )
    fid = resp.json["id"]

    resp = ngw_webtest_app.get(API_URL + str(fid), status=200)
    assert resp.json["extensions"]["description"] == description
