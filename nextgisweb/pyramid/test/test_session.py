# -*- coding: utf-8 -*-
from __future__ import division, absolute_import, print_function, unicode_literals

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
        if key == 'session':
            return value.value
    return None


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

    headers = dict(cookie=str('session=%s' % session_id))
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
