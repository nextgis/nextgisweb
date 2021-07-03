# -*- coding: utf-8 -*-
from __future__ import division, absolute_import, print_function, unicode_literals

import pytest
import transaction
from freezegun import freeze_time

from nextgisweb.models import DBSession
from nextgisweb.core.storage import KindOfData
from nextgisweb.core.model import storage_stat_delta


class TestKOD1(KindOfData):
    identity = 'test_kod_1'
    display_name = identity


class TestKOD2(KindOfData):
    identity = 'test_kod_2'
    display_name = identity


@pytest.fixture(scope='module', autouse=True)
def prepare_storage(ngw_env):
    with transaction.manager:
        ngw_env.core._clear_storage_tables()
    
    with ngw_env.core.options.override({'storage.enabled': True}):
        yield

    ngw_env.core.estimate_storage_all()


def test_storage(ngw_env, ngw_webtest_app, ngw_auth_administrator):
    reserve_storage = ngw_env.core.reserve_storage
    with freeze_time() as dt, transaction.manager:
        assert 'storage_reservations' not in DBSession().info

        reserve_storage('test_comp_1', TestKOD1, value_data_volume=100)
        reserve_storage('test_comp_1', TestKOD2, value_data_volume=20)
        reserve_storage('test_comp_2', TestKOD1, value_data_volume=400)
        reserve_storage('test_comp_2', TestKOD2, value_data_volume=80)

        assert 'storage_reservations' in DBSession().info
        assert len(DBSession().info['storage_reservations']) == 4

    assert len(DBSession().info['storage_reservations']) == 0

    cur = ngw_env.core.query_storage()
    assert cur[TestKOD1.identity] == dict(
        estimated=None, updated=dt(), data_volume=500)
    
    res = ngw_webtest_app.get('/api/component/pyramid/storage', status=200)
    assert res.json['']['updated'] == dt().isoformat()
    assert res.json[TestKOD1.identity]['data_volume'] == 500
    assert res.json[TestKOD2.identity]['data_volume'] == 100
