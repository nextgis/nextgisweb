# -*- coding: utf-8 -*-
from __future__ import division, absolute_import, print_function, unicode_literals

import pytest
import transaction

from nextgisweb.auth import User
from nextgisweb.models import DBSession
from nextgisweb.resource import ACLRule, Resource, ResourceGroup, ResourceScope


@pytest.fixture(scope='module')
def user_id(ngw_resource_group):
    with transaction.manager:
        user = User(
            keyname='test_user',
            display_name='Test User',
        ).persist()

    DBSession \
        .query(Resource) \
        .filter_by(id=ngw_resource_group) \
        .update(dict(owner_user_id=user.id))

    yield user.id

    with transaction.manager:
        DBSession.delete(User.filter_by(id=user.id).one())


def test_change_owner(ngw_resource_group, user_id, ngw_webtest_app, ngw_auth_administrator):
    url = '/api/resource/%d' % ngw_resource_group

    def owner_data(owner_id):
        return dict(resource=dict(owner_user=dict(id=owner_id)))

    admin = User.filter_by(keyname='administrator').one()

    ngw_webtest_app.put_json(url, owner_data(admin.id), status=200)

    with transaction.manager:
        ACLRule(
            resource_id=ngw_resource_group,
            principal=admin,
            identity=ResourceGroup.identity,
            scope=ResourceScope.identity,
            permission='update',
            action='deny',
        ).persist()

    ngw_webtest_app.put_json(url, owner_data(user_id), status=403)
