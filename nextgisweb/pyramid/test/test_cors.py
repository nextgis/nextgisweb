# -*- coding: utf-8 -*-
from __future__ import division, absolute_import, print_function, unicode_literals

import pytest

good_domains = [
    'http://example.com',
    'http://test.qqq'
]
bad_domains = [
    'http://very.bad',
    'http://bad.domain'
]


@pytest.fixture()
def cors_settings(ngw_env):
    try:
        value = ngw_env.core.settings_get('pyramid', 'cors_allow_origin')
    except KeyError:
        value = None

    ngw_env.core.settings_set('pyramid', 'cors_allow_origin', good_domains)

    yield

    if value is not None:
        ngw_env.core.settings_set('pyramid', 'cors_allow_origin', value)
    else:
        ngw_env.core.settings_delete('pyramid', 'cors_allow_origin')


@pytest.mark.parametrize('domain, resource_exists, expected_ok', (
    (good_domains[0], True, True),
    (good_domains[1], False, True),
    (bad_domains[0], False, False),
    (bad_domains[1], True, False),
))
def test_cors_headers(domain, resource_exists, expected_ok, ngw_webtest_app, cors_settings):
    ngw_webtest_app.authorization = ('Basic', ('administrator', 'admin'))

    url = '/api/resource/%d' % (0 if resource_exists else -1)
    response = ngw_webtest_app.get(url, headers=dict(Origin=str(domain)), status='*')

    exp_creds = 'true' if expected_ok else None
    exp_origin = domain if expected_ok else None
    assert response.headers.get('Access-Control-Allow-Credentials') == exp_creds
    assert response.headers.get('Access-Control-Allow-Origin') == exp_origin


@pytest.mark.parametrize('domain, resource_exists, expected_ok', (
    (good_domains[0], True, True),
    (good_domains[1], False, True),
    (bad_domains[0], False, False),
    (bad_domains[1], True, False),
))
def test_cors_options(domain, resource_exists, expected_ok, ngw_webtest_app, cors_settings):
    ngw_webtest_app.authorization = ('Basic', ('administrator', 'admin'))

    url = '/api/resource/%d' % (0 if resource_exists else -1)
    response = ngw_webtest_app.options(url, headers={
        'Origin': str(domain),
        'Access-Control-Request-Method': str('OPTIONS')
    }, status='*')

    exp_creds = 'true' if expected_ok else None
    exp_origin = domain if expected_ok else None
    exp_methods = 'OPTIONS' if expected_ok else None
    assert response.headers.get('Access-Control-Allow-Credentials') == exp_creds
    assert response.headers.get('Access-Control-Allow-Origin') == exp_origin
    assert response.headers.get('Access-Control-Allow-Methods') == exp_methods
