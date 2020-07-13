# -*- coding: utf-8 -*-
from __future__ import division, absolute_import, print_function, unicode_literals
from datetime import timedelta

from freezegun import freeze_time


def test_http_basic(webapp):
    webapp.reset()

    webapp.authorization = None
    resp = webapp.get('/api/component/auth/user/', expect_errors=True)
    assert resp.status_code == 403

    webapp.authorization = ('Basic', ('administrator', 'admin'))
    resp = webapp.get('/api/component/auth/current_user')
    assert resp.status_code == 200
    assert resp.json['keyname'] == 'administrator'

    webapp.authorization = ('Basic', ('administrator', 'invalid'))
    resp = webapp.get('/api/component/auth/current_user', expect_errors=True)
    assert resp.status_code == 401


def test_api_login_logout(webapp):
    webapp.reset()
    webapp.authorization = None

    resp = webapp.post('/api/component/auth/login', dict(
        login='administrator', password='admin'))
    assert resp.status_code == 200

    _dummy_auth_request(webapp)

    resp = webapp.post('/api/component/auth/logout')
    resp = webapp.get('/api/component/auth/user/', expect_errors=True)
    assert resp.status_code == 403


def test_local_refresh(webapp, env):
    webapp.reset()
    webapp.authorization = None

    lifetime = env.auth.options['policy.local.lifetime']
    refresh = env.auth.options['policy.local.refresh']
    epsilon = timedelta(seconds=5)

    with freeze_time() as dt:
        start = dt()

        resp = webapp.post('/api/component/auth/login', dict(
            login='administrator', password='admin'))
        assert resp.status_code == 200

        dt.tick(lifetime + epsilon)
        _dummy_auth_request(webapp, 403)

        dt.move_to(start)
        dt.tick(refresh)
        _dummy_auth_request(webapp, 200)

        dt.tick(lifetime - epsilon)
        _dummy_auth_request(webapp, 200)


def _dummy_auth_request(webapp, status_code=200):
    resp = webapp.get(
        '/api/component/auth/user/',
        expect_errors=status_code < 200 or status_code >= 300)
    assert resp.status_code == status_code
