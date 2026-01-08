import pytest
import transaction

from nextgisweb.lib.geometry import Geometry

from nextgisweb.feature_layer import Feature
from nextgisweb.feature_layer.test import FeatureLayerAPI, parametrize_versioning
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

        return obj.id

    yield _mkres


@parametrize_versioning()
def test_workflow(versioning, mkres):
    res = mkres(versioning)
    fapi = FeatureLayerAPI(res, extensions=["description"])
    vid = lambda v: ({"vid": v} if versioning else {})

    with fapi.transaction() as txn:  # Version 2
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

    with fapi.transaction() as txn:  # Version 3
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

    assert fapi.feature_get(1, version=3) == {
        "id": 1,
        "vid": 1,
        "geom": "POINT(0 0)",
        "fields": {},
        "extensions": {"description": {"value": None, "version": 3}},
    }

    assert fapi.feature_get(2, version=3) == {
        "id": 2,
        "vid": 1,
        "geom": "POINT(0 0)",
        "fields": {},
        "extensions": {"description": {"value": "Qux", "version": 3}},
    }

    assert fapi.feature_get(3, version=3) == {
        "id": 3,
        "vid": 1,
        "geom": "POINT(0 0)",
        "fields": {},
        "extensions": {"description": {"value": "Ham", "version": 3}},
    }

    with fapi.transaction() as txn:  # Version 4
        txn.put(2, dict(action="description.restore", fid=1))
        txn.commit()

        assert txn.results() == [
            [2, dict(action="description.restore")],
        ]

    changes = fapi.changes(initial=1, filter=["description."])
    assert changes == [
        {"action": "description.put", "fid": 1, "vid": 4, "value": "Foo"},
        {"action": "description.put", "fid": 2, "vid": 3, "value": "Qux"},
        {"action": "description.put", "fid": 3, "vid": 3, "value": "Ham"},
    ]

    changes = fapi.changes(initial=2, filter=["description."])
    assert changes == [
        {"action": "description.put", "fid": 2, "vid": 3, "value": "Qux"},
        {"action": "description.put", "fid": 3, "vid": 3, "value": "Ham"},
    ]

    with fapi.transaction() as txn:  # Version 5
        txn.put(1, dict(action="feature.create"))
        txn.put(2, dict(action="description.put", fid=dict(sn=1), value="New"))
        txn.commit()

        assert txn.results() == [
            [1, dict(action="feature.create", fid=4)],
            [2, dict(action="description.put")],
        ]

    changes = fapi.changes(initial=4)
    assert changes == [
        {"action": "feature.create", "fid": 4, "vid": 5, "fields": []},
        {"action": "description.put", "fid": 4, "vid": 5, "value": "New"},
    ]

    def _vstrip(data: list):
        result = []
        for item in data:
            item.pop("vid", None)
            description = item["extensions"]["description"]
            if isinstance(description, dict):
                item["extensions"]["description"] = description["value"]
            result.append(item)
        return result

    latest = expected_version = fapi.versioning()["latest"]
    snapshots = {v: _vstrip(fapi.feature_list(version=v)) for v in range(1, latest + 1)}
    snapshots[0] = []

    for v in reversed(range(0, latest)):
        with fapi.transaction() as txn:
            txn.put(1, dict(action="revert", tid=v))
            txn.commit()

        expected_version += 1
        assert fapi.versioning()["latest"] == expected_version

        actual = _vstrip(fapi.feature_list())
        assert actual == snapshots[v]
