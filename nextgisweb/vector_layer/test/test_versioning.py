import itertools
from pathlib import Path

import pytest
import transaction
import webtest
from msgspec import to_builtins

from nextgisweb.env import DBSession
from nextgisweb.lib.geometry import Geometry

from nextgisweb.feature_layer import Feature
from nextgisweb.feature_layer.exception import FeatureNotFound, RestoreNotDeleted

from ..model import VectorLayer, VectorLayerField

pytestmark = pytest.mark.usefixtures("ngw_resource_defaults", "ngw_auth_administrator")

DATA_PATH = Path(__file__).parent / "data"


def test_model(ngw_txn):
    res = VectorLayer(geometry_type="POINTZ").persist()
    res.fields = [VectorLayerField(keyname="foo", datatype="STRING", display_name="foo")]
    res.fversioning_configure(enabled=True)
    res.fversioning_close()
    DBSession.flush()

    vcur = itertools.count(start=1)

    assert res.fversioning.epoch
    assert res.fversioning.latest == next(vcur)

    for _ in range(2):
        vnext = next(vcur)
        with res.fversioning_context() as vobj:
            assert vobj.version_id == vnext
            assert res.fversioning.latest == vnext - 1
            vobj.mark_changed()
        assert res.fversioning.latest == vnext

    with res.fversioning_context() as vobj:
        for _ in range(5):
            feat = Feature()
            feat.geom = Geometry.from_wkt("POINT (0 0 0)")
            res.feature_create(feat)
    assert res.fversioning.latest == next(vcur)

    with res.fversioning_context() as vobj:
        feat = Feature(id=1)
        feat.geom = Geometry.from_wkt("POINT (0 0 1)")
        res.feature_put(feat)
    vup = next(vcur)
    assert res.fversioning.latest == vup

    with res.fversioning_context():
        pass
    assert res.fversioning.latest == vup  # No changes at all

    with res.fversioning_context() as vobj:
        res.feature_put(feat)
    assert res.fversioning.latest == vup  # Geometry hasn't changed

    with res.fversioning_context():
        feat.fields["foo"] = "1"
        res.feature_put(feat)
    vup = next(vcur)
    assert res.fversioning.latest == vup

    with res.fversioning_context():
        feat.fields["foo"] = 1
        res.feature_put(feat)
    assert res.fversioning.latest == vup  # Actual value hasn't changed

    with res.fversioning_context():
        feat.fields["foo"] = 2
        res.feature_put(feat)
    assert res.fversioning.latest == next(vcur)

    # Compare current and previous versions
    query = res.feature_query()
    query.filter_by(id=1)
    (cfeat,) = query()
    assert cfeat.fields["foo"] == "2"

    query = res.feature_query()
    query.pit(res.fversioning.latest - 1)
    query.filter_by(id=1)
    (pfeat,) = query()
    assert pfeat.fields["foo"] == "1"

    # Delete 1st and 2nd
    with res.fversioning_context() as vobj:
        for id in (1, 2):
            res.feature_delete(id)
        with pytest.raises(FeatureNotFound):
            res.feature_delete(9)
    assert res.fversioning.latest == next(vcur)

    # Restore 1st (success), 3rd (not deleted), 9th (never existed)
    with res.fversioning_context() as vobj:
        res.feature_restore(Feature(id=1))
        with pytest.raises(RestoreNotDeleted):
            res.feature_restore(Feature(id=3))
        with pytest.raises(RestoreNotDeleted):
            res.feature_restore(Feature(id=9))
    assert res.fversioning.latest == next(vcur)

    query = res.feature_query()
    query.filter_by(id=1)
    (pfeat,) = query()
    assert pfeat.fields["foo"] == "2"

    # Delete everything
    with res.fversioning_context() as vobj:
        res.feature_delete_all()
    assert res.fversioning.latest == next(vcur)


def test_ogrloader(ngw_webtest_app, ngw_resource_group_sub):
    web = ngw_webtest_app

    upload_meta = web.post(
        "/api/component/file_upload/",
        dict(file=webtest.Upload(str(DATA_PATH / "pointz.geojson"))),
    ).json["upload_meta"][0]

    res_id = web.post_json(
        "/api/resource/",
        dict(
            resource=dict(
                cls="vector_layer",
                display_name="test_ogrloader",
                parent=dict(id=ngw_resource_group_sub),
            ),
            feature_layer=dict(
                versioning=dict(enabled=True),
            ),
            vector_layer=dict(
                source=upload_meta,
                srs=dict(id=3857),
            ),
        ),
        status=201,
    ).json["id"]

    url = f"/api/resource/{res_id}"
    flv = web.get(url).json["feature_layer"]["versioning"]
    assert flv.pop("epoch", None)
    assert flv == dict(enabled=True, latest=1)


F1, F2 = range(1, 3)
C, U, D, R = "feature.create", "feature.update", "feature.delete", "feature.restore"

CHANGES_SCRIPT = {
    #   0123456789
    F1: "C-UDR-D--",
    F2: "-C-U-DRD-",
}

CHANGES_TESTS = [
    [0, 1, {F1: (C, 1)}],
    [0, 2, {F1: (C, 1), F2: (C, 2)}],
    [0, 3, {F1: (C, 3), F2: (C, 2)}],
    [0, 4, {F2: (C, 4)}],
    [0, 5, {F1: (C, 5), F2: (C, 4)}],
    [0, 6, {F1: (C, 5)}],
    [0, 7, {F2: (C, 7)}],
    [0, 8, {}],
    [1, 2, {F2: (C, 2)}],
    [1, 3, {F1: (U, 3), F2: (C, 2)}],
    [1, 4, {F1: (D, 4), F2: (C, 4)}],
    [4, 5, {F1: (R, 5)}],
    [6, 7, {F1: (D, 7), F2: (R, 7)}],
    [8, 9, {}],
]


@pytest.fixture(scope="module")
def vres():
    with transaction.manager:
        res = VectorLayer(geometry_type="POINTZ").persist()
        res.fields = [VectorLayerField(keyname="foo", datatype="STRING", display_name="foo")]
        res.fversioning_configure(enabled=True)
        for vid in range(1, len(CHANGES_SCRIPT[1]) + 1):
            if vid != 1:
                res.fversioning_open()
            for fid, seq in CHANGES_SCRIPT.items():
                act = seq[vid - 1]
                if act == "-":
                    continue
                elif act == "C":
                    feat = Feature(res)
                    feat.fields["foo"] = f"C@{vid}"
                    cfid = res.feature_create(feat)
                    assert cfid == fid
                elif act == "U":
                    feat = Feature(res, id=fid)
                    feat.fields["foo"] = f"U@{vid}"
                    res.feature_put(feat)
                elif act == "D":
                    res.feature_delete(fid)
                elif act == "R":
                    feat = Feature(res, id=fid)
                    res.feature_restore(feat)
                else:
                    raise NotImplementedError
            res.fversioning.vobj.mark_changed()
            res.fversioning_close()

    yield res.id


@pytest.mark.parametrize(
    "initial, target, expected",
    [pytest.param(i, t, e, id=f"{i}_{t}") for i, t, e in CHANGES_TESTS],
)
def test_changes(initial, target, expected, vres):
    res = VectorLayer.filter_by(id=vres).one()
    expected = dict(expected)
    for op in res.fversioning_changes(initial=initial, target=target, fid_min=0, fid_max=9):
        fid, vid = op.fid, op.vid
        action = to_builtins(op)["action"]

        assert fid in expected, f"#{fid} unexpected: {action}, {vid}"
        eaction, evid = expected.pop(fid)
        assert vid == evid, f"#{fid} vid: got {vid} instead of {evid}"
        assert action == eaction, f"#{fid} action: got {action} instead of {eaction}"

    assert expected == dict()
