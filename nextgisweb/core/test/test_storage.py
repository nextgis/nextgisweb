# -*- coding: utf-8 -*-
from __future__ import division, absolute_import, print_function, unicode_literals

import pytest
import transaction

from nextgisweb.core import (
    KindOfData,
    reserve_storage,
    storage_stat_dimension,
    storage_stat_dimension_total,
    storage_stat_delta,
    storage_stat_delta_total,
)
from nextgisweb.resource import (
    ResourceGroup,
)
from nextgisweb.models import DBSession


class Test1KindOfData(KindOfData):
    identity = 'test_1_kind_of_data'
    display_name = identity


class Test2KindOfData(KindOfData):
    identity = 'test_2_kind_of_data'
    display_name = identity


@pytest.fixture(scope='module', autouse=True)
def clear_storage(ngw_env):
    with transaction.manager:
        storage_stat_dimension.delete().execute()
        storage_stat_dimension_total.delete().execute()
        storage_stat_delta.delete().execute()
        storage_stat_delta_total.delete().execute()

    yield

    ngw_env.core.estimate_storage_all()


def test_storage(ngw_webtest_app, ngw_auth_administrator):
    with transaction.manager:
        reserve_storage('test_comp_1', Test1KindOfData, value_data_volume=100)
        reserve_storage('test_comp_1', Test2KindOfData, value_data_volume=20)

        reserve_storage('test_comp_2', Test1KindOfData, value_data_volume=400)
        reserve_storage('test_comp_2', Test2KindOfData, value_data_volume=80)

        # rg = ResourceGroup.filter_by(id=0).one()
        # rg.keyname = 'rg'

    DBSession.flush()

    res = ngw_webtest_app.get('/api/component/pyramid/storage', status=200)
    print(res.json)
