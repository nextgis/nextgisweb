from contextlib import contextmanager
from secrets import token_hex

import transaction

from nextgisweb.auth import User
from nextgisweb.spatial_ref_sys import SRS

from .. import VectorLayer


@contextmanager
def create_feature_layer(ogrlayer, *, ngw_httptest_app=None, **kwargs):
    assert all(k in ("parent_id",) for k in kwargs.keys())

    with transaction.manager:
        layer = VectorLayer(
            display_name=token_hex(),
            owner_user=User.by_keyname("administrator"),
            srs=SRS.filter_by(id=3857).one(),
            **kwargs,
        ).persist()
        layer.from_source(ogrlayer)

    yield layer
