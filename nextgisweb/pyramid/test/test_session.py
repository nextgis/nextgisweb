# -*- coding: utf-8 -*-
from __future__ import division, absolute_import, print_function, unicode_literals

from datetime import datetime, timedelta

from freezegun import freeze_time
import pytest
import transaction
from pyramid.response import Response
from six.moves.http_cookies import SimpleCookie

from nextgisweb.pyramid import Session, SessionStore


prefix = '_test_'


@pytest.fixture(scope='module')
def webapp(env):
    from webtest import TestApp
    config = env.pyramid.make_app({})

    def test_session_kv(request):
        try:
            body = request.json_body
        except ValueError:
            body = dict()

        for k, v in body.items():
            if k.startswith(prefix):
                if v is None:
                    if k in request.session:
                        del request.session[k]
                else:
                    request.session[k] = v

        return Response()

    config.add_route(
        'test.session_kv', '/test/session_kv') \
        .add_view(test_session_kv, request_method='POST')

    yield TestApp(config.make_wsgi_app())

    with transaction.manager:
        pattern = '%s%%' % prefix
        Session.filter(Session.store.any(
            SessionStore.key.like(pattern)
        )).delete(synchronize_session=False)


def get_session_id(response):
    cookie = SimpleCookie()
    cookie.load(response.headers['Set-Cookie'])
    for key, value in cookie.items():
        if key == 'ngwsid':
            return value.value
    return None


def session_headers(session_id):
    return dict(cookie=str('ngwsid=%s' % session_id))


def read_store(session_id):
    result = dict()
    for kv in SessionStore.filter_by(session_id=session_id).all():
        result[kv.key] = kv.value
    return result


def test_session_kv(webapp):
    kv = dict(_test_A='A', _test_B='B1')
    res = webapp.post_json('/test/session_kv', kv)
    session_id = get_session_id(res)
    assert session_id is not None
    assert read_store(session_id) == kv

    headers = session_headers(session_id)
    kv['_test_B'] = 'B2'
    webapp.post_json('/test/session_kv', kv, headers=headers)
    assert get_session_id(res) == session_id
    assert read_store(session_id) == kv

    part = dict(_test_B='B2')
    webapp.post_json('/test/session_kv', part, headers=headers)
    kv.update(part)
    assert read_store(session_id) == kv

    webapp.post_json('/test/session_kv', dict(_test_B=None), headers=headers)
    del kv['_test_B']
    assert read_store(session_id) == kv


@pytest.fixture()
def touch_max_age(env):
    value = env.pyramid.options['session.max_age']
    yield
    env.pyramid.options['session.max_age'] = value


def test_session_lifetime(env, webapp, touch_max_age):
    env.pyramid.options['session.max_age'] = 100
    with freeze_time(datetime(year=2011, month=1, day=1)) as frozen_dt:
        res = webapp.post_json('/test/session_kv', dict(_test_var=1))
        session_id = get_session_id(res)

        frozen_dt.tick(timedelta(seconds=90))
        headers = session_headers(session_id)
        res = webapp.post_json('/test/session_kv', dict(_test_var=2), headers=headers)
        assert session_id == get_session_id(res)

        frozen_dt.tick(timedelta(seconds=90))
        res = webapp.post_json('/test/session_kv', dict(_test_var=3), headers=headers)
        assert session_id == get_session_id(res)

        frozen_dt.tick(timedelta(seconds=101))
        res = webapp.post_json('/test/session_kv', dict(_test_var=4), headers=headers)
        new_session_id = get_session_id(res)
        assert session_id != new_session_id

        env.pyramid.options['session.max_age'] = 110
        frozen_dt.tick(timedelta(seconds=100))
        headers = session_headers(new_session_id)
        res = webapp.post_json('/test/session_kv', dict(_test_var=5), headers=headers)
        assert new_session_id == get_session_id(res)
