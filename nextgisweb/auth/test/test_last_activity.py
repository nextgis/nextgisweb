# -*- coding: utf-8 -*-
from __future__ import division, absolute_import, print_function, unicode_literals

from datetime import datetime, timedelta

import pytest

from nextgisweb.auth import User


@pytest.fixture()
def revert_delta(ngw_env):
    value = ngw_env.auth.options['activity_delta']
    yield
    ngw_env.auth.options['activity_delta'] = value


def test_last_activity(ngw_env, ngw_webtest_app, revert_delta):
    epsilon = timedelta(milliseconds=500)

    ngw_env.auth.options['activity_delta'] = timedelta(seconds=0)
    ngw_webtest_app.get('/resource/0', status='*')
    last_activity = User.by_keyname('guest').last_activity
    assert datetime.utcnow() - last_activity < epsilon

    ngw_env.auth.options['activity_delta'] = timedelta(seconds=100)
    ngw_webtest_app.get('/resource/0', status='*')
    assert User.by_keyname('guest').last_activity == last_activity

    ngw_env.auth.options['activity_delta'] = timedelta(seconds=0)
    ngw_webtest_app.authorization = ('Basic', ('administrator', 'admin'))
    ngw_webtest_app.get('/resource/0', status='*')
    admin_last_activity = User.by_keyname('administrator').last_activity
    assert datetime.utcnow() - admin_last_activity < epsilon
    assert User.by_keyname('guest').last_activity == last_activity
