from contextlib import contextmanager
from pathlib import Path

import pytest
import transaction

from nextgisweb.env import DBSession
from nextgisweb.lib.geometry import Geometry

from nextgisweb.feature_layer import Feature
from nextgisweb.feature_layer.versioning.exception import VersioningContextRequired
from nextgisweb.file_storage import FileObj
from nextgisweb.vector_layer.model import VectorLayer, VectorLayerField

from ..model import FeatureAttachment

pytestmark = pytest.mark.usefixtures("ngw_resource_defaults", "ngw_auth_administrator")

DATA_PATH = Path(__file__).parent / "data"


def setup_vector_layer(*, versioning):
    resource = VectorLayer(geometry_type="POINTZ").persist()
    resource.fields = [VectorLayerField(keyname="foo", datatype="STRING", display_name="foo")]
    resource.fversioning_configure(enabled=versioning)

    feature = Feature(resource)
    feature.geom = Geometry.from_wkt("POINT Z (0 0 0)")
    feature.id = resource.feature_create(feature)

    feature_attachment = FeatureAttachment(
        resource=resource,
        feature_id=feature.id,
        fileobj=FileObj().from_content(b""),
        name="foo",
        size=0,
        mime_type="application/octet-stream",
    ).persist()

    resource.fversioning_close(raise_if_not_enabled=False)
    DBSession.flush()

    return resource, feature, feature_attachment


def test_model(ngw_txn, ngw_env):
    resource, feature, fa = setup_vector_layer(versioning=True)

    fileobj = FileObj().from_content(b"")
    with resource.fversioning_context():
        fa.fileobj = fileobj
        fa.name = "bar"

    with resource.fversioning_context():
        fa.delete()


def test_delete_resource(ngw_env):
    with transaction.manager:
        resource, _, _ = setup_vector_layer(versioning=True)

    with transaction.manager:
        DBSession.delete(resource)


@pytest.mark.parametrize("objmeth", [True, False])
@pytest.mark.parametrize("context", [True, False])
def test_delete_feature_attachment(objmeth, context, ngw_env):
    @contextmanager
    def _raises():
        if objmeth and context:
            yield
        else:
            with pytest.raises(VersioningContextRequired):
                yield

    @contextmanager
    def _versioning_context():
        if context:
            with resource.fversioning_context():
                yield
        else:
            yield

    with _raises():
        with transaction.manager:
            resource, _, fa = setup_vector_layer(versioning=True)
            with _versioning_context():
                if objmeth:
                    fa.delete()
                else:
                    DBSession.delete(fa)
            DBSession.flush()
