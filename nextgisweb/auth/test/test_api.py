# -*- coding: utf-8 -*-
from __future__ import division, absolute_import, print_function, unicode_literals

import pytest
import transaction

from nextgisweb import db
from nextgisweb.auth import User, Group
from nextgisweb.models import DBSession


@pytest.fixture()
def user_limit(ngw_env):
    active_uids = []

    with transaction.manager:
        for user in User.filter(db.and_(
            User.keyname != 'administrator',
            db.not_(User.disabled),
            db.not_(User.system)
        )).all():
            user.disabled = True
            active_uids.append(user.id)
        DBSession.flush()

    with ngw_env.auth.options.override(dict(user_limit=2)):
        yield

    with transaction.manager:
        for user in User.filter(User.id.in_(active_uids)).all():
            user.disabled = False
        DBSession.flush()


def test_user_limit(ngw_env, ngw_webtest_app, ngw_auth_administrator, user_limit):
    API_URL = '/api/component/auth/user/'

    admins = Group.filter_by(keyname='administrators').one()

    vasya = dict(keyname='test-vasya', display_name='Test Vasya',
                 password='12345', disabled=False, member_of=[admins.id])

    res = ngw_webtest_app.post_json(API_URL, vasya, status=200)
    vasya_id = res.json['id']

    petya = dict(keyname='test-petya', display_name='Test Petya',
                 password='67890', disabled=False)
    ngw_webtest_app.post_json(API_URL, petya, status=422)

    vasya['disabled'] = True
    ngw_webtest_app.put_json(API_URL + str(vasya_id), vasya, status=200)

    res = ngw_webtest_app.post_json(API_URL, petya, status=200)
    petya_id = res.json['id']

    masha = dict(keyname='test-masha', display_name='Test Masha',
                 password='password', disabled=False)
    ngw_webtest_app.post_json(API_URL, masha, status=422)   

    ngw_webtest_app.delete(API_URL + str(vasya_id), status=200)
    ngw_webtest_app.delete(API_URL + str(petya_id), status=200)
