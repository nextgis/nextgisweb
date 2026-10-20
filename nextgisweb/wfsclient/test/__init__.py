from contextlib import contextmanager
from secrets import token_hex

import transaction

from nextgisweb.env import DBSession

from nextgisweb.auth import User
from nextgisweb.spatial_ref_sys import SRS
from nextgisweb.vector_layer.test import create_feature_layer as create_vector_layer
from nextgisweb.wfsserver import Layer as WFS_Service_Layer
from nextgisweb.wfsserver import Service as WFSService

from .. import WFSConnection, WFSLayer


@contextmanager
def create_feature_layer(ogrlayer, *, ngw_httptest_app, **kwargs):
    assert all(k in ("parent_id",) for k in kwargs.keys())

    with create_vector_layer(ogrlayer, **kwargs) as vlayer:
        with transaction.manager:
            res_common = {"owner_user": User.by_keyname("administrator"), **kwargs}
            service = WFSService(
                display_name=token_hex(),
                **res_common,
            ).persist()
            service_layer = WFS_Service_Layer(
                resource_id=vlayer.id, display_name=token_hex(), keyname="layer"
            )
            service.layers.append(service_layer)

        with transaction.manager:
            wfs_path = "{}/api/resource/{}/wfs".format(ngw_httptest_app.base_url, service.id)
            connection = WFSConnection(
                **res_common,
                display_name=token_hex(),
                path=wfs_path,
                version="2.0.2",
                username="administrator",
                password="admin",
            ).persist()

            layer = WFSLayer(
                **res_common,
                display_name=token_hex(),
                connection=connection,
                srs=SRS.filter_by(id=3857).one(),
                layer_name=service_layer.keyname,
                column_geom="geom",
                geometry_srid=vlayer.srs_id,
                geometry_type="POINT",
            ).persist()

            DBSession.flush()

            layer.setup()

        yield layer
