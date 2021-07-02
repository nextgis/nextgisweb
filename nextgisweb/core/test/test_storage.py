# -*- coding: utf-8 -*-
from __future__ import division, absolute_import, print_function, unicode_literals

from datetime import datetime

import pytest
import transaction
from freezegun import freeze_time

from nextgisweb.core import (
    KindOfData,
    storage_stat_dimension,
    storage_stat_dimension_total,
    storage_stat_delta,
    storage_stat_delta_total,
)


class Test1KindOfData(KindOfData):
    identity = 'test_1_kind_of_data'
    display_name = identity


class Test2KindOfData(KindOfData):
    identity = 'test_2_kind_of_data'
    display_name = identity


@pytest.fixture(scope='module', autouse=True)
def prepare_storage(ngw_env):
    storage_enabled = ngw_env.core.options['storage.enabled']
    ngw_env.core.options['storage.enabled'] = True

    with transaction.manager:
        storage_stat_dimension.delete().execute()
        storage_stat_dimension_total.delete().execute()
        storage_stat_delta.delete().execute()
        storage_stat_delta_total.delete().execute()

    yield

    ngw_env.core.options['storage.enabled'] = storage_enabled
    ngw_env.core.estimate_storage_all()


def test_storage(ngw_env, ngw_webtest_app, ngw_auth_administrator):
    with freeze_time() as dt:
        ngw_env.core.reserve_storage('test_comp_1', Test1KindOfData, value_data_volume=100)
        ngw_env.core.reserve_storage('test_comp_1', Test2KindOfData, value_data_volume=20)

        ngw_env.core.reserve_storage('test_comp_2', Test1KindOfData, value_data_volume=400)
        ngw_env.core.reserve_storage('test_comp_2', Test2KindOfData, value_data_volume=80)

    res = ngw_webtest_app.get('/api/component/pyramid/storage', status=200)
    assert datetime.fromisoformat(res.json['timestamp']) == dt()

    storage = res.json['storage']
    assert storage[Test1KindOfData.identity] == 500
    assert storage[Test2KindOfData.identity] == 100
