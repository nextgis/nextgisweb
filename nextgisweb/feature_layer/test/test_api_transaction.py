from base64 import b64encode

import pytest
import transaction

from nextgisweb.env import DBSession
from nextgisweb.lib.geometry import Geometry

from nextgisweb.vector_layer.model import VectorLayer, VectorLayerField

from ..feature import Feature
from . import FeatureLayerAPI, TransactionAPI

pytestmark = pytest.mark.usefixtures("ngw_resource_defaults", "ngw_auth_administrator")


@pytest.fixture(scope="module")
def mkres():
    def _mkres(versioning, fdict):
        with transaction.manager:
            obj = VectorLayer(geometry_type="POINTZ").persist()
            obj.fields = [VectorLayerField(keyname="foo", datatype="STRING", display_name="foo")]
            obj.fversioning_configure(enabled=versioning)

            for i in (1, 2, 3, 4):
                feat = Feature(geom=Geometry.from_wkt(f"POINT Z (0 0 {i})"))
                feat.fields["foo"] = "Original"
                obj.feature_create(feat)

            DBSession.flush()
            epoch = obj.fversioning.epoch if versioning else None

        fld_id = obj.fields[0].id
        return (obj.id, epoch, (lambda v: dict(foo=v)) if fdict else (lambda v: [(fld_id, v)]))

    yield _mkres


def wkb64(wkt):
    return b64encode(Geometry.from_wkt(wkt).wkb).decode("ascii")


def ptz(x, y, z):
    return wkb64(f"POINT Z ({x} {y} {z})")


@pytest.mark.parametrize(
    "versioning",
    [
        pytest.param(False, id="versioning_disabled"),
        pytest.param(True, id="versioning_enabled"),
    ],
)
@pytest.mark.parametrize(
    "fdict",
    [
        pytest.param(False, id="fdict"),
        pytest.param(True, id="flist"),
    ],
)
def test_workflow(versioning, fdict, mkres, ngw_webtest_app):
    (res, epoch, fld), web = mkres(versioning, fdict), ngw_webtest_app

    fapi = FeatureLayerAPI(web, res)
    vid = lambda v: ({"vid": v} if versioning else {})

    with TransactionAPI(web, res, epoch=epoch) as txn:
        # Repeats of the same data should also report 200 OK
        for _ in range(2):
            txn.put(1, _create(geom=ptz(0, 0, 5), fields=fld("Inserted")))

        # But another operation should report 409 Conflict
        txn.put(1, _delete(fid=1), status=409)

        # Update the first and delete the second
        txn.put(2, _update(fid=1, geom=ptz(1, 1, 1), fields=fld("Updated")))
        txn.put(3, _delete(fid=2))
        txn.put(4, _update(fid=3))
        txn.put(5, _update(fid=4, geom=None))

        # Results aren't available until commit happens
        txn.results(status=422)

        # Now commit the transaction twice, it's safe
        resp_a = txn.commit()
        resp_b = txn.commit()
        assert resp_a == resp_b

        # Compare results
        assert txn.results() == [
            [1, _create(fid=5)],
            [2, _update()],
            [3, _delete()],
            [4, _update()],
            [5, _update()],
        ]

    # No results after dispose
    txn.results(status=404)

    # Validate resource features
    assert len(fapi.feature_list(status=200)) == 4

    assert fapi.feature_get(1) == {
        "id": 1,
        **vid(2),
        "geom": "POINT Z (1 1 1)",
        "fields": {"foo": "Updated"},
    }

    assert set(fapi.feature_get(2, status=404).keys()).issuperset({"title", "message"})

    assert fapi.feature_get(3) == {
        "id": 3,
        **vid(2),
        "geom": "POINT Z (0 0 3)",
        "fields": {"foo": "Original"},
    }

    assert fapi.feature_get(4) == {
        "id": 4,
        **vid(2),
        "geom": None,
        "fields": {"foo": "Original"},
    }

    assert fapi.feature_get(5) == {
        "id": 5,
        **vid(2),
        "geom": "POINT Z (0 0 5)",
        "fields": {"foo": "Inserted"},
    }

    if not versioning:
        return

    with TransactionAPI(web, res, epoch=epoch) as txn:
        # Restore the deleted feature
        txn.put(1, _restore(fid=2, fields=fld("Restored")))

        txn.commit()

        assert txn.results() == [
            [1, _restore()],
        ]

    assert fapi.feature_get(2) == {
        "id": 2,
        **vid(3),
        "geom": "POINT Z (0 0 2)",
        "fields": {"foo": "Restored"},
    }


@pytest.mark.parametrize(
    "versioning",
    [
        pytest.param(False, id="versioning_disabled"),
        pytest.param(True, id="versioning_enabled"),
    ],
)
@pytest.mark.parametrize(
    "fdict",
    [
        pytest.param(False, id="fdict"),
        pytest.param(True, id="flist"),
    ],
)
def test_errors(versioning, fdict, mkres, ngw_webtest_app):
    (res, epoch, fld), web = mkres(versioning, fdict), ngw_webtest_app

    fapi = FeatureLayerAPI(web, res)
    vid = lambda v: ({"vid": v} if versioning else {})

    with TransactionAPI(web, res, epoch=epoch) as txn:
        txn.put(1, _update(fid=10, fields=fld("Updated")))
        txn.put(2, _update(fid=11, fields=fld("Omitted")))

        # Repeated commits should report the same
        status = txn.commit_try(status="errors")
        assert status == txn.commit_try()

        assert status == {
            "status": "errors",
            "errors": [
                [
                    1,
                    {
                        "error": "feature.not_found",
                        "message": "Feature not found",
                        "status_code": 404,
                    },
                ],
                [
                    2,
                    {
                        "error": "feature.not_found",
                        "message": "Feature not found",
                        "status_code": 404,
                    },
                ],
            ],
        }

        # Results are not available
        txn.results(status=422)

        # Fix the first, drop the second, and commit
        txn.put(1, _update(fid=1, fields=fld("Updated")))
        txn.put(2, None)
        txn.commit()

        assert txn.results() == [
            [1, _update()],
        ]

    assert fapi.feature_get(1) == {
        "id": 1,
        **vid(2),
        "geom": "POINT Z (0 0 1)",
        "fields": {"foo": "Updated"},
    }

    if not versioning:
        return

    with TransactionAPI(web, res, epoch=epoch) as txn:
        # Cause a version conflict
        txn.put(1, _update(fid=1, vid=0, fields=fld("Updated")))
        assert txn.commit_try(status="errors") == {
            "status": "errors",
            "errors": [
                [
                    1,
                    {
                        "error": "feature.conflict",
                        "message": "Feature version conflict",
                        "status_code": 409,
                    },
                ]
            ],
        }

        # Fix and commit
        txn.put(1, _update(fid=1, vid=2, fields=fld("Updated")))
        txn.commit()


_create = lambda **kwargs: dict(action="feature.create", **kwargs)
_update = lambda **kwargs: dict(action="feature.update", **kwargs)
_delete = lambda **kwargs: dict(action="feature.delete", **kwargs)
_restore = lambda **kwargs: dict(action="feature.restore", **kwargs)
