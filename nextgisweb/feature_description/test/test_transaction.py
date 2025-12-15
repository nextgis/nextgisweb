import pytest
import transaction

from nextgisweb.env import DBSession
from nextgisweb.lib.geometry import Geometry

from nextgisweb.feature_layer import Feature
from nextgisweb.feature_layer.test import FeatureLayerAPI, TransactionAPI
from nextgisweb.vector_layer import VectorLayer

pytestmark = pytest.mark.usefixtures("ngw_resource_defaults", "ngw_auth_administrator")


@pytest.fixture(scope="module")
def mkres():
    def _mkres(versioning):
        with transaction.manager:
            obj = VectorLayer(geometry_type="POINT").persist()
            obj.fversioning_configure(enabled=versioning)

            for _ in range(3):
                feat = Feature(geom=Geometry.from_wkt("POINT(0 0)"))
                obj.feature_create(feat)

            DBSession.flush()
            epoch = obj.fversioning.epoch if versioning else None

        return (obj.id, epoch)

    yield _mkres


@pytest.mark.parametrize(
    "versioning",
    [
        pytest.param(False, id="versioning_disabled"),
        pytest.param(True, id="versioning_enabled"),
    ],
)
def test_workflow(versioning, mkres, ngw_webtest_app):
    web = ngw_webtest_app
    res, epoch = mkres(versioning)
    fapi = FeatureLayerAPI(web, res, extensions=["description"])
    vid = lambda v: ({"vid": v} if versioning else {})

    with TransactionAPI(web, res, epoch=epoch) as txn:  # Version 2
        for _ in range(2):
            # Repeats of the same data should also report 200 OK
            txn.put(1, dict(action="description.put", fid=1, value="Foo"))

        txn.put(2, dict(action="description.put", fid=2, value="Bar"))
        txn.put(3, dict(action="description.put", fid=3, value="Zoo"))

        # But another operation should report 409 Conflict
        txn.put(1, dict(action="description.put", fid=1, value="Qux"), status=409)

        # Results aren't available until commit happens
        txn.results(status=422)

        # Now commit the transaction twice, it's safe
        commit_1 = txn.commit()
        commit_2 = txn.commit()
        assert commit_1 == commit_2

        assert txn.results() == [
            [1, dict(action="description.put")],
            [2, dict(action="description.put")],
            [3, dict(action="description.put")],
        ]

    # Transaction is already disposed
    txn.results(status=404)

    assert len(fapi.feature_list(status=200)) == 3

    assert fapi.feature_get(1) == {
        "id": 1,
        **vid(1),  # Not description, geom and fields version!
        "geom": "POINT(0 0)",
        "fields": {},
        "extensions": {"description": "Foo"},
    }

    if not versioning:
        return

    with TransactionAPI(web, res, epoch=epoch) as txn:  # Version 3
        txn.put(1, dict(action="description.put", fid=1, vid=2, value=None))
        txn.put(2, dict(action="description.put", fid=2, vid=2, value="Qux"))
        txn.put(3, dict(action="description.put", fid=3, vid=0, value="Ham"))

        error = txn.commit_errors()[0][1]["error"]
        assert error == "description.conflict"
        txn.put(3, dict(action="description.put", fid=3, vid=2, value="Ham"))

        txn.commit()

        assert txn.results() == [
            [1, dict(action="description.put")],
            [2, dict(action="description.put")],
            [3, dict(action="description.put")],
        ]

    assert fapi.feature_get(1) == {
        "id": 1,
        **vid(1),  # Not description, geom and fields version!
        "geom": "POINT(0 0)",
        "fields": {},
        "extensions": {"description": None},
    }

    assert fapi.feature_get(2) == {
        "id": 2,
        **vid(1),  # Not description, geom and fields version!
        "geom": "POINT(0 0)",
        "fields": {},
        "extensions": {"description": "Qux"},
    }

    assert fapi.feature_get(3) == {
        "id": 3,
        **vid(1),  # Not description, geom and fields version!
        "geom": "POINT(0 0)",
        "fields": {},
        "extensions": {"description": "Ham"},
    }

    with TransactionAPI(web, res, epoch=epoch) as txn:  # Version 4
        txn.put(2, dict(action="description.restore", fid=1))
        txn.commit()

        assert txn.results() == [
            [2, dict(action="description.restore")],
        ]

    changes = fapi.changes(epoch=epoch, initial=1, filter=["description."])
    assert changes == [
        {"action": "description.put", "fid": 2, "vid": 3, "value": "Qux"},
        {"action": "description.put", "fid": 3, "vid": 3, "value": "Ham"},
        {"action": "description.put", "fid": 1, "vid": 4, "value": "Foo"},
    ]

    changes = fapi.changes(epoch=epoch, initial=2, filter=["description."])
    assert changes == [
        {"action": "description.put", "fid": 2, "vid": 3, "value": "Qux"},
        {"action": "description.put", "fid": 3, "vid": 3, "value": "Ham"},
    ]
