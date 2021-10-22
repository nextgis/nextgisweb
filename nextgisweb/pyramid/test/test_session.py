import json
from datetime import datetime, timedelta
from http.cookies import SimpleCookie

from freezegun import freeze_time
import pytest
from webtest import TestApp as BaseTestApp
import transaction
from pyramid.response import Response

from nextgisweb.pyramid import Session, SessionStore


prefix = '_test_'


@pytest.fixture(scope='module')
def cwebapp(ngw_env):
    config = ngw_env.pyramid.make_app({})

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

    yield BaseTestApp(config.make_wsgi_app())

    with transaction.manager:
        pattern = '%s%%' % prefix
        Session.filter(Session.store.any(
            SessionStore.key.like(pattern)
        )).delete(synchronize_session=False)


@pytest.fixture()
def get_session_id(ngw_env):
    def _wrap(response):
        cookie = SimpleCookie()
        if 'Set-Cookie' not in response.headers:
            return None
        cookie.load(response.headers['Set-Cookie'])
        for key, value in cookie.items():
            if key == ngw_env.pyramid.options['session.cookie.name']:
                return value.value
        return None
    yield _wrap


@pytest.fixture()
def session_headers(ngw_env):
    def _wrap(session_id):
        return dict(cookie='%s=%s' % (
            ngw_env.pyramid.options['session.cookie.name'], session_id))
    yield _wrap


def read_store(session_id):
    result = dict()
    for kv in SessionStore.filter_by(session_id=session_id).all():
        result[kv.key] = json.loads(kv.value)
    return result


def test_session_store(cwebapp, get_session_id, session_headers):
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
def save_options(ngw_env):
    with ngw_env.pyramid.options.override({
        'session.cookie.max_age': None,
        'session.activity_delta': None,
    }):
        yield


def test_session_lifetime(ngw_env, cwebapp, save_options, get_session_id, session_headers):
    cwebapp.reset()

    ngw_env.pyramid.options['session.cookie.max_age'] = timedelta(seconds=100)
    ngw_env.pyramid.options['session.activity_delta'] = timedelta(seconds=0)
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
        assert new_session_id is not None
        assert session_id != new_session_id

        ngw_env.pyramid.options['session.cookie.max_age'] = timedelta(seconds=110)
        frozen_dt.tick(timedelta(seconds=100))
        headers = session_headers(new_session_id)
        res = cwebapp.post_json('/test/session_kv', dict(_test_var=5), headers=headers)
        assert new_session_id == get_session_id(res)

        ngw_env.pyramid.options['session.activity_delta'] = timedelta(seconds=65)
        frozen_dt.tick(timedelta(seconds=60))
        res = cwebapp.post_json('/test/session_kv', dict(_test_var=6), headers=headers)
        assert get_session_id(res) is None

        frozen_dt.tick(timedelta(seconds=60))
        res = cwebapp.post_json('/test/session_kv', dict(_test_var=7), headers=headers)
        session_id = get_session_id(res)
        assert session_id is not None
        assert new_session_id != session_id


@pytest.mark.parametrize('key, value, error', (
    ('none', None, None),
    ('str', 'foo', None),
    ('int', 42, None),
    ('float', 3.14159, None),
    ('bool', True, None),
    ('list', [], ValueError),
    pytest.param('tuple', (1, 2, ('nested', 'tuple')), None, id='tuple'),
    pytest.param('deep', ('we', ('need', ('to', ('go', ('deeper',))))), None, id='deep'),
    pytest.param('mutable', ('ok', (None, (True, ('bad', dict())))), ValueError, id='mutable'),
    pytest.param('k' * 1024, 'v' * 1024, None, id='long'),
))
def test_serialization(key, value, error, ngw_webtest_app, webapp_handler):
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
                ngw_webtest_app.get('/test/request/')
            return
        else:
            ngw_webtest_app.get('/test/request/')

    with webapp_handler(_get):
        ngw_webtest_app.get('/test/request/')

    with webapp_handler(_del):
        ngw_webtest_app.get('/test/request/')


def test_set_del(ngw_webtest_app, webapp_handler):

    def _set(request):
        request.session['foo'] = 1
        request.session['bar'] = 1
        return Response()

    def _del(request):
        del request.session['foo']
        request.session['foo'] = 2

        request.session['bar'] = 2
        del request.session['bar']

        return Response()

    def _check(request):
        assert request.session['foo'] == 2
        assert 'bar' not in request.session
        return Response()

    for req in (_set, _del, _check):
        with webapp_handler(req):
            ngw_webtest_app.get('/test/request/')


def test_exception(ngw_webtest_app, webapp_handler):

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
        ngw_webtest_app.get('/test/request/')


@pytest.mark.parametrize('handler, expect', (
    ('empty', False),
    ('attr', False),
    ('get', False),
    ('set', True),
    ('del', False),
    ('clear', False),
))
def test_session_start(handler, expect, ngw_webtest_app, webapp_handler):
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
        ngw_webtest_app.get('/test/request/')
        assert ('ngw-sid' in ngw_webtest_app.cookies) == expect
