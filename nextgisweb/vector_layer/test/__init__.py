from contextlib import contextmanager
from secrets import token_hex

import transaction

from nextgisweb.env import DBSession

from nextgisweb.auth import User
from nextgisweb.spatial_ref_sys import SRS

from .. import VectorLayer


@contextmanager
def create_feature_layer(ogrlayer, parent_id, **kwargs):
    with transaction.manager:
        layer = VectorLayer(
            parent_id=parent_id,
            display_name=token_hex(),
            owner_user=User.by_keyname("administrator"),
            srs=SRS.filter_by(id=3857).one(),
        ).persist()

        layer.setup_from_ogr(ogrlayer)
        layer.load_from_ogr(ogrlayer)

        DBSession.flush()

    yield layer
