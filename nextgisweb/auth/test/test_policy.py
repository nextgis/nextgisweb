# -*- coding: utf-8 -*-
from __future__ import division, absolute_import, print_function, unicode_literals


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

    resp = webapp.get('/api/component/auth/user/')
    assert resp.status_code == 200

    resp = webapp.post('/api/component/auth/logout')
    resp = webapp.get('/api/component/auth/user/', expect_errors=True)
    assert resp.status_code == 403
