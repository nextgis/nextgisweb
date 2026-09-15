from pathlib import Path
from tempfile import NamedTemporaryFile
from zipfile import ZipFile

import pytest
import transaction

from nextgisweb.env import DBSession
from nextgisweb.lib.geometry import Geometry

from nextgisweb.feature_layer import Feature
from nextgisweb.pyramid.test import WebTestApp
from nextgisweb.vector_layer.model import VectorLayer, VectorLayerField

from ..model import FeatureDescription

pytestmark = pytest.mark.usefixtures("ngw_resource_defaults", "ngw_auth_administrator")

DATA_PATH = Path(__file__).parent / "data"


def test_model(ngw_txn, ngw_env):
    resource = VectorLayer(geometry_type="POINTZ").persist()
    resource.fields = [VectorLayerField(keyname="foo", datatype="STRING", display_name="foo")]
    resource.fversioning_configure(enabled=True)
    feat = Feature(resource)
    feat.geom = Geometry.from_wkt("POINT Z (0 0 0)")
    feat.id = resource.feature_create(feat)

    fd = FeatureDescription(
        resource=resource,
        feature_id=feat.id,
        value="foo",
    ).persist()

    resource.fversioning_close(raise_if_not_enabled=False)
    DBSession.flush()

    with resource.feature_transaction():
        fd.value = "bar"

    with resource.feature_transaction():
        fd.delete()


@pytest.mark.parametrize(
    "replace, expected",
    (
        pytest.param(False, "foo", id="keep"),
        pytest.param(True, "bar", id="replace"),
    ),
)
def test_import(replace, expected, ngw_file_upload, ngw_webtest_app: WebTestApp):
    with transaction.manager:
        resource = VectorLayer(geometry_type="POINTZ").persist()
        resource.fields = [VectorLayerField(keyname="foo", datatype="STRING", display_name="foo")]
        resource.fversioning_configure(enabled=True)
        feat = Feature(resource)
        feat.geom = Geometry.from_wkt("POINT Z (0 0 0)")
        feat.id = resource.feature_create(feat)

        FeatureDescription(
            resource=resource,
            feature_id=feat.id,
            value="foo",
        ).persist()

        resource.fversioning_close(raise_if_not_enabled=False)

    with NamedTemporaryFile() as f:
        with ZipFile(f, "w") as z:
            content = b"<html><body>bar</body></html>"
            z.writestr(f"{feat.id}.html", content)

        upload_meta = ngw_file_upload(f.name)

    ngw_webtest_app.put(
        f"/api/resource/{resource.id}/feature_description/import",
        json={"source": upload_meta, "replace": replace},
        status=200,
    )

    resp = ngw_webtest_app.get(f"/api/resource/{resource.id}/feature/{feat.id}", status=200)
    assert resp.json["extensions"]["description"] == expected
