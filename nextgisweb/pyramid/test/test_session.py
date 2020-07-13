# -*- coding: utf-8 -*-
from __future__ import division, absolute_import, print_function, unicode_literals

import json
from datetime import datetime, timedelta

from freezegun import freeze_time
import pytest
import transaction
from pyramid.response import Response
from six.moves.http_cookies import SimpleCookie

from nextgisweb.pyramid import Session, SessionStore


prefix = '_test_'


@pytest.fixture(scope='function', autouse=True)
def reset(webapp):
    webapp.reset()


@pytest.fixture(scope='module')
def cwebapp(env):
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
        result[kv.key] = json.loads(kv.value)
    return result


def test_session_store(cwebapp):
    kv = dict(_test_A='A', _test_B='B1')
    res = cwebapp.post_json('/test/session_kv', kv)
    session_id = get_session_id(res)
    assert session_id is not None
    assert read_store(session_id) == kv

    headers = session_headers(session_id)
    kv['_test_B'] = 'B2'
    cwebapp.post_json('/test/session_kv', kv, headers=headers)
    assert get_session_id(res) == session_id
    assert read_store(session_id) == kv

    part = dict(_test_B='B2')
    cwebapp.post_json('/test/session_kv', part, headers=headers)
    kv.update(part)
    assert read_store(session_id) == kv

    cwebapp.post_json('/test/session_kv', dict(_test_B=None), headers=headers)
    del kv['_test_B']
    assert read_store(session_id) == kv


@pytest.fixture()
def touch_max_age(env):
    value = env.pyramid.options['session.max_age']
    yield
    env.pyramid.options['session.max_age'] = value


def test_session_lifetime(env, cwebapp, touch_max_age):
    env.pyramid.options['session.max_age'] = 100
    with freeze_time(datetime(year=2011, month=1, day=1)) as frozen_dt:
        res = cwebapp.post_json('/test/session_kv', dict(_test_var=1))
        session_id = get_session_id(res)

        frozen_dt.tick(timedelta(seconds=90))
        headers = session_headers(session_id)
        res = cwebapp.post_json('/test/session_kv', dict(_test_var=2), headers=headers)
        assert session_id == get_session_id(res)

        frozen_dt.tick(timedelta(seconds=90))
        res = cwebapp.post_json('/test/session_kv', dict(_test_var=3), headers=headers)
        assert session_id == get_session_id(res)

        frozen_dt.tick(timedelta(seconds=101))
        res = cwebapp.post_json('/test/session_kv', dict(_test_var=4), headers=headers)
        new_session_id = get_session_id(res)
        assert session_id != new_session_id

        env.pyramid.options['session.max_age'] = 110
        frozen_dt.tick(timedelta(seconds=100))
        headers = session_headers(new_session_id)
        res = cwebapp.post_json('/test/session_kv', dict(_test_var=5), headers=headers)
        assert new_session_id == get_session_id(res)


@pytest.mark.parametrize('key, value, error', (
    ('NoneType', None, None),
    ('str', 'foo', None),
    ('int', 42, None),
    ('bool', True, None),
    ('list', [], ValueError),
    pytest.param('tuple', (1, 2, ('nested', 'tuple')), None, id='tuple'),
    pytest.param('deep', ('we', ('need', ('to', ('go', ('deeper',))))), None, id='deep'),
    pytest.param('bad_child', ('ok', (None, (True, ('bad', dict())))), ValueError, id='bad_child'),
    pytest.param('k' * 1024, 'v' * 1024, KeyError, id='big'),
))
def test_serialization(key, value, error, webapp, webapp_handler):
    def _set(request):
        request.session[key] = value
        return Response()

    def _get(request):
        assert type(request.session[key]) == type(value)
        assert request.session[key] == value
        return Response()

    def _del(request):
        del request.session[key]
        with pytest.raises(KeyError):
            del request.session[key]
        with pytest.raises(KeyError):
            request.session[key]
        return Response()

    with webapp_handler(_set):
        if error is not None:
            with pytest.raises(error):
                webapp.get('/test/request/')
            return
        else:
            webapp.get('/test/request/')

    with webapp_handler(_get):
        webapp.get('/test/request/')

    with webapp_handler(_del):
        webapp.get('/test/request/')


def test_exception(webapp, webapp_handler):

    def _handler(request):
        with pytest.raises(KeyError):
            request.session['invalid']

        with pytest.raises(KeyError):
            del request.session['invalid']

        # Session should validate that value is immutable, and
        # may raise more specific exception.
        with pytest.raises(ValueError):
            request.session['mutable'] = ('foo', [], dict())

        return Response()

    with webapp_handler(_handler):
        webapp.get('/test/request/')


@pytest.mark.parametrize('handler, expect', (
    ('empty', False),
    ('attr', False),
    ('get', False),
    ('set', True),
    ('del', False),
    ('clear', False),
))
def test_session_start(handler, expect, webapp, webapp_handler):
    def _handler(request):
        if handler == 'empty':
            pass
        elif handler == 'attr':
            request.session
        elif handler == 'get':
            with pytest.raises(KeyError):
                request.session['foo']
        elif handler == 'set':
            request.session['foo'] = 'bar'
        elif handler == 'del':
            request.session['foo'] = 'bar'
            del request.session['foo']
        elif handler == 'clear':
            request.session['foo'] = 'bar'
            request.session.clear()
        else:
            raise ValueError("Invalid handler: " + handler)
        return Response()

    with webapp_handler(_handler):
        webapp.get('/test/request/')
        assert ('ngwsid' in webapp.cookies) == expect
