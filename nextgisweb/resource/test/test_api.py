# -*- coding: utf-8 -*-
from __future__ import division, absolute_import, print_function, unicode_literals

import pytest
import transaction

from nextgisweb.auth import User
from nextgisweb.models import DBSession
from nextgisweb.resource import ResourceGroup


def test_disable_resources(
    ngw_env, ngw_webtest_app,
    ngw_auth_administrator, ngw_resource_group
):
    def create_resource_group(display_name, expected_status):
        ngw_webtest_app.post_json('/api/resource/', dict(resource=dict(
            cls='resource_group', parent=dict(id=ngw_resource_group),
            display_name=display_name)
        ), status=expected_status)

    with ngw_env.resource.options.override({'disable.resource_group': True}):
        create_resource_group('disable.resource_group', 422)

    with ngw_env.resource.options.override({'disabled_cls': ['resource_group', ]}):
        create_resource_group('diabled_cls', 422)


@pytest.fixture(scope='module')
def resource(ngw_resource_group):
    with transaction.manager:
        obj = ResourceGroup(
            parent_id=ngw_resource_group, display_name='Test Юникод Symbols ~%',
            keyname='Test-Keyname',
            owner_user=User.by_keyname('administrator'),
        ).persist()

        DBSession.flush()
        DBSession.expunge(obj)

    yield obj

    with transaction.manager:
        DBSession.delete(ResourceGroup.filter_by(id=obj.id).one())


def test_resource_search(resource, ngw_webtest_app, ngw_auth_administrator):
    api_url = '/api/resource/search/'

    resp = ngw_webtest_app.get(api_url, dict(
        display_name='Test Юникод Symbols ~%'), status=200)
    assert len(resp.json) == 1

    resp = ngw_webtest_app.get(api_url, dict(
        display_name='Test Юникод Symbols ~%', keyname='other'), status=200)
    assert len(resp.json) == 0

    resp = ngw_webtest_app.get(api_url, dict(
        display_name__ilike='test юни%'), status=200)
    assert len(resp.json) == 1
    assert resp.json[0]['resource']['display_name'] == resource.display_name
