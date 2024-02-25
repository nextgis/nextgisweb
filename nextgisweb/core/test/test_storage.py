from time import sleep

import pytest
import transaction
from freezegun import freeze_time

from nextgisweb.env import DBSession

from nextgisweb.feature_attachment.component import FeatureAttachmentData
from nextgisweb.vector_layer import VectorLayer

from .. import KindOfData
from ..storage import SQL_LOCK, StorageLimitExceeded

pytestmark = pytest.mark.usefixtures("ngw_resource_defaults", "ngw_auth_administrator")


class TestKOD1(KindOfData):
    identity = "test_kod_1"
    display_name = identity


class TestKOD2(KindOfData):
    identity = "test_kod_2"
    display_name = identity


@pytest.fixture(scope="function", autouse=True)
def prepare_storage(ngw_env):
    with transaction.manager:
        ngw_env.core._clear_storage_tables()

    with ngw_env.core.options.override({"storage.enabled": True}):
        yield


@pytest.fixture(scope="module", autouse=True)
def reset_storage(ngw_env):
    yield

    if ngw_env.core.options["storage.enabled"]:
        ngw_env.core.estimate_storage_all()


def test_storage(ngw_env, ngw_webtest_app):
    reserve_storage = ngw_env.core.reserve_storage
    with freeze_time() as dt, transaction.manager:
        assert "storage.res" not in DBSession().info

        reserve_storage("test_comp_1", TestKOD1, value_data_volume=100)
        reserve_storage("test_comp_1", TestKOD2, value_data_volume=20)
        reserve_storage("test_comp_2", TestKOD1, value_data_volume=400)
        reserve_storage("test_comp_2", TestKOD2, value_data_volume=80)

        assert "storage.txn" in DBSession().info
        assert "storage.res" in DBSession().info
        assert len(DBSession().info["storage.res"]) == 4

    assert "storage.txn" not in DBSession().info
    assert "storage.res" not in DBSession().info

    cur = ngw_env.core.query_storage()
    assert cur[""] == dict(estimated=None, updated=dt(), data_volume=600)
    assert cur[TestKOD1.identity] == dict(estimated=None, updated=dt(), data_volume=500)

    res = ngw_webtest_app.get("/api/component/pyramid/storage", status=200)
    assert res.json[""]["updated"] == dt().isoformat()
    assert res.json[""]["data_volume"] == 600
    assert res.json[TestKOD1.identity]["data_volume"] == 500
    assert res.json[TestKOD2.identity]["data_volume"] == 100


def vector_layer():
    res = VectorLayer(geometry_type="POINT").persist()
    res.setup_from_fields([])
    return res


def test_resource(ngw_env, ngw_webtest_app):
    reserve_storage = ngw_env.core.reserve_storage
    with transaction.manager:
        res1 = vector_layer()
        res2 = vector_layer()

        reserve_storage("test_comp", TestKOD1, resource=res1, value_data_volume=100)
        reserve_storage("test_comp", TestKOD2, resource=res1, value_data_volume=10)
        reserve_storage("test_comp", TestKOD1, resource=res2, value_data_volume=200)

        DBSession.flush()
        DBSession.expunge(res1)
        DBSession.expunge(res2)

    resp = ngw_webtest_app.get("/api/resource/%d/volume" % res1.id, status=200)
    assert resp.json["volume"] == 110

    resp = ngw_webtest_app.get("/api/resource/%d/volume" % res2.id, status=200)
    assert resp.json["volume"] == 200

    cur = ngw_env.core.query_storage()
    assert cur[""]["data_volume"] == 310
    assert cur[TestKOD1.identity]["data_volume"] == 300

    with transaction.manager:
        DBSession.delete(res1)

    cur = ngw_env.core.query_storage()
    assert cur[""]["data_volume"] == 200

    with transaction.manager:
        DBSession.delete(res2)

    cur = ngw_env.core.query_storage()
    assert cur[""]["data_volume"] == 0


def estimage(app):
    app.post("/api/component/pyramid/storage/estimate", status=200)
    sleep(0.05)  # Give a chance to start a thread and acquire the lock
    with transaction.manager:
        # Wait estimation end
        DBSession.execute(SQL_LOCK)


def test_estimate_all(ngw_env, ngw_webtest_app):
    with transaction.manager:
        res = vector_layer()
        DBSession.flush()
        DBSession.expunge(res)

    feature = dict(geom="POINT (0 0)")
    resp = ngw_webtest_app.post_json("/api/resource/%d/feature/" % res.id, feature)
    fid = resp.json["id"]

    content = "some-content"
    resp = ngw_webtest_app.put("/api/component/file_upload/", content)
    file_upload = resp.json
    ngw_webtest_app.post_json(
        "/api/resource/%d/feature/%d/attachment/" % (res.id, fid), dict(file_upload=file_upload)
    )

    estimage(ngw_webtest_app)

    cur = ngw_env.core.query_storage(dict(resource_id=lambda col: col == res.id))
    assert FeatureAttachmentData.identity in cur
    assert cur[FeatureAttachmentData.identity]["data_volume"] == len(content)

    with transaction.manager:
        DBSession.delete(res)


def test_storage_limit_exceeded(ngw_env):
    core = ngw_env.core
    with transaction.manager:
        with core.options.override({"storage.limit": 100}):
            core.reserve_storage("test_comp", TestKOD1, value_data_volume=50)
            with pytest.raises(StorageLimitExceeded):
                core.reserve_storage("test_comp", TestKOD1, value_data_volume=60)
            core.reserve_storage("test_comp", TestKOD1, value_data_volume=40)
        assert DBSession().info["storage.txn"] == 90

    with transaction.manager:
        with core.options.override({"storage.limit": 50}):
            with pytest.raises(StorageLimitExceeded):
                core.check_storage_limit()


def test_check_limit_after_estimate(ngw_env, ngw_webtest_app):
    with transaction.manager:
        res = vector_layer()
        DBSession.flush()

    feature = dict(geom="POINT (0 0)")
    resp = ngw_webtest_app.post_json("/api/resource/%d/feature/" % res.id, feature)
    fid = resp.json["id"]

    content = "some-content"
    resp = ngw_webtest_app.put("/api/component/file_upload/", content)
    resp = ngw_webtest_app.post_json(
        "/api/resource/%d/feature/%d/attachment/" % (res.id, fid), dict(file_upload=resp.json)
    )
    aid = resp.json["id"]

    estimage(ngw_webtest_app)

    resp = ngw_webtest_app.get("/api/component/pyramid/storage", status=200)
    current = resp.json[""]["data_volume"]

    def try_upload(ok):
        ngw_webtest_app.put("/api/component/file_upload/upload", b"A", status=201 if ok else 402)

    with ngw_env.core.options.override({"storage.limit": current - 1}):
        try_upload(False)
        ngw_webtest_app.delete("/api/resource/%d/feature/%d/attachment/%d" % (res.id, fid, aid))
        estimage(ngw_webtest_app)
        try_upload(True)
