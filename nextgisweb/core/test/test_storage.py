from uuid import uuid4
from time import sleep

import pytest
import transaction
from freezegun import freeze_time

from ...auth import User
from ...feature_attachment import FeatureAttachmentData
from ...models import DBSession
from ...spatial_ref_sys import SRS
from ...vector_layer import VectorLayer
from .. import KindOfData
from ..storage import SQL_LOCK, StorageLimitExceeded


class TestKOD1(KindOfData):
    identity = 'test_kod_1'
    display_name = identity


class TestKOD2(KindOfData):
    identity = 'test_kod_2'
    display_name = identity


@pytest.fixture(scope='function', autouse=True)
def prepare_storage(ngw_env):
    with transaction.manager:
        ngw_env.core._clear_storage_tables()

    with ngw_env.core.options.override({'storage.enabled': True}):
        yield


@pytest.fixture(scope='module', autouse=True)
def reset_storage(ngw_env):
    yield

    if ngw_env.core.options['storage.enabled']:
        ngw_env.core.estimate_storage_all()


def test_storage(ngw_env, ngw_webtest_app, ngw_auth_administrator):
    reserve_storage = ngw_env.core.reserve_storage
    with freeze_time() as dt, transaction.manager:
        assert 'storage.res' not in DBSession().info

        reserve_storage('test_comp_1', TestKOD1, value_data_volume=100)
        reserve_storage('test_comp_1', TestKOD2, value_data_volume=20)
        reserve_storage('test_comp_2', TestKOD1, value_data_volume=400)
        reserve_storage('test_comp_2', TestKOD2, value_data_volume=80)

        assert 'storage.txn' in DBSession().info
        assert 'storage.res' in DBSession().info
        assert len(DBSession().info['storage.res']) == 4

    assert 'storage.txn' not in DBSession().info
    assert 'storage.res' not in DBSession().info

    cur = ngw_env.core.query_storage()
    assert cur[''] == dict(
        estimated=None, updated=dt(), data_volume=600)
    assert cur[TestKOD1.identity] == dict(
        estimated=None, updated=dt(), data_volume=500)

    res = ngw_webtest_app.get('/api/component/pyramid/storage', status=200)
    assert res.json['']['updated'] == dt().isoformat()
    assert res.json['']['data_volume'] == 600
    assert res.json[TestKOD1.identity]['data_volume'] == 500
    assert res.json[TestKOD2.identity]['data_volume'] == 100


def vector_layer(display_name, parent_id):
    res = VectorLayer(
        parent_id=parent_id,
        display_name=display_name,
        owner_user=User.by_keyname('administrator'),
        srs=SRS.filter_by(id=3857).one(),
        geometry_type='POINT',
        tbl_uuid=uuid4().hex,
    ).persist()
    res.setup_from_fields([])
    return res


def test_resource_storage(ngw_env, ngw_resource_group, ngw_webtest_app, ngw_auth_administrator):
    reserve_storage = ngw_env.core.reserve_storage
    with transaction.manager:
        res1 = vector_layer('test-resource-1', ngw_resource_group)
        res2 = vector_layer('test-resource-2', ngw_resource_group)

        reserve_storage('test_comp', TestKOD1, resource=res1, value_data_volume=100)
        reserve_storage('test_comp', TestKOD2, resource=res1, value_data_volume=10)
        reserve_storage('test_comp', TestKOD1, resource=res2, value_data_volume=200)

        DBSession.flush()
        DBSession.expunge(res1)
        DBSession.expunge(res2)

    resp = ngw_webtest_app.get('/api/resource/%d/volume' % res1.id, status=200)
    assert resp.json['volume'] == 110

    resp = ngw_webtest_app.get('/api/resource/%d/volume' % res2.id, status=200)
    assert resp.json['volume'] == 200

    cur = ngw_env.core.query_storage()
    assert cur['']['data_volume'] == 310
    assert cur[TestKOD1.identity]['data_volume'] == 300

    with transaction.manager:
        DBSession.delete(res1)

    cur = ngw_env.core.query_storage()
    assert cur['']['data_volume'] == 200

    with transaction.manager:
        DBSession.delete(res2)

    cur = ngw_env.core.query_storage()
    assert cur['']['data_volume'] == 0


def test_storage_estimate_all(ngw_env, ngw_resource_group, ngw_webtest_app, ngw_auth_administrator):
    with transaction.manager:
        res = vector_layer('test-vector-layer', ngw_resource_group)
        DBSession.flush()
        DBSession.expunge(res)

    feature = dict(geom='POINT (0 0)')
    ngw_webtest_app.post_json('/api/resource/%d/feature/' % res.id, feature)

    content = 'some-content'
    resp = ngw_webtest_app.put('/api/component/file_upload/', content)
    file_upload = resp.json
    ngw_webtest_app.post_json('/api/resource/%d/feature/%d/attachment/' % (res.id, 1), dict(
        file_upload=file_upload))

    ngw_webtest_app.post('/api/component/pyramid/estimate_storage', status=200)
    sleep(0.05)  # Give a chance to start a thread and acquire the lock

    with transaction.manager:
        # Wait estimation end
        DBSession.execute(SQL_LOCK)

    cur = ngw_env.core.query_storage(dict(resource_id=lambda col: col == res.id))
    assert FeatureAttachmentData.identity in cur
    assert cur[FeatureAttachmentData.identity]['data_volume'] == len(content)

    with transaction.manager:
        DBSession.delete(res)


def test_storage_limit_exceeded(ngw_env):
    core = ngw_env.core
    with transaction.manager:
        with core.options.override({'storage.limit': 100}):
            core.reserve_storage('test_comp', TestKOD1, value_data_volume=50)
            with pytest.raises(StorageLimitExceeded):
                core.reserve_storage('test_comp', TestKOD1, value_data_volume=60)
            core.reserve_storage('test_comp', TestKOD1, value_data_volume=40)
        assert DBSession().info['storage.txn'] == 90

    with transaction.manager:
        with core.options.override({'storage.limit': 50}):
            with pytest.raises(StorageLimitExceeded):
                core.check_storage_limit()
