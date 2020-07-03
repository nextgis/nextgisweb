# -*- coding: utf-8 -*-
from __future__ import division, absolute_import, print_function, unicode_literals

from datetime import datetime, timedelta

import pytest

from nextgisweb.auth import User


@pytest.fixture()
def revert_delta(env):
    value = env.file_upload.tus_enabled
    yield
    env.auth.options['activity_delta'] = value


def test_last_activity(env, webapp, revert_delta):
    epsilon = timedelta(milliseconds=500)

    env.auth.options['activity_delta'] = 0
    webapp.get('/resource/0', status='*')
    last_activity = User.by_keyname('guest').last_activity
    assert datetime.utcnow() - last_activity < epsilon

    env.auth.options['activity_delta'] = 100
    webapp.get('/resource/0', status='*')
    assert User.by_keyname('guest').last_activity == last_activity

    env.auth.options['activity_delta'] = 0
    webapp.authorization = ('Basic', ('administrator', 'admin'))
    webapp.get('/resource/0', status='*')
    admin_last_activity = User.by_keyname('administrator').last_activity
    assert datetime.utcnow() - admin_last_activity < epsilon
    assert User.by_keyname('guest').last_activity == last_activity
