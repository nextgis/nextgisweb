# -*- coding: utf-8 -*-
from __future__ import division, absolute_import, print_function, unicode_literals

from datetime import datetime, timedelta

from nextgisweb.auth import User


def test_last_activity(ngw_env, ngw_webtest_app):
    epsilon = timedelta(milliseconds=500)

    with ngw_env.auth.options.override(activity_delta=timedelta(seconds=0)):
        ngw_webtest_app.get('/resource/0', status='*')
        last_activity = User.by_keyname('guest').last_activity
        assert datetime.utcnow() - last_activity < epsilon

    with ngw_env.auth.options.override(activity_delta=timedelta(seconds=100)):
        ngw_webtest_app.get('/resource/0', status='*')
        assert User.by_keyname('guest').last_activity == last_activity

    with ngw_env.auth.options.override(activity_delta=timedelta(seconds=0)):
        ngw_webtest_app.authorization = ('Basic', ('administrator', 'admin'))
        ngw_webtest_app.get('/resource/0', status='*')
        admin_last_activity = User.by_keyname('administrator').last_activity
        assert datetime.utcnow() - admin_last_activity < epsilon
        assert User.by_keyname('guest').last_activity == last_activity
