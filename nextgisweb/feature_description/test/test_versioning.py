from pathlib import Path

import pytest

from nextgisweb.env import DBSession
from nextgisweb.lib.geometry import Geometry

from nextgisweb.feature_layer import Feature
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

    with resource.fversioning_context():
        fd.value = "bar"

    with resource.fversioning_context():
        fd.delete()
