from contextlib import contextmanager

import pytest

from nextgisweb.component import Component, load_all


def pytest_generate_tests(metafunc):
    if "component" in metafunc.fixturenames:
        load_all()
        metafunc.parametrize('component', [c.identity for c in Component.registry])


@pytest.fixture(scope='module')
def webtest(ngw_webtest_factory):
    return ngw_webtest_factory()


def test_route(webtest):
    webtest.get('/api/component/pyramid/route')


def test_pkg_version(webtest):
    webtest.get('/api/component/pyramid/pkg_version')


def test_healthcheck(webtest):
    webtest.get('/api/component/pyramid/healthcheck')


def test_settings(component, webtest):
    if hasattr(Component.registry[component], 'client_settings'):
        webtest.get('/api/component/pyramid/settings?component={}'.format(component))


def test_locdata(component, webtest):
    webtest.get('/api/component/pyramid/locdata/{component}/en'.format(
        component=component))


@pytest.fixture()
def override(ngw_core_settings_override):
    @contextmanager
    def wrapped(comp, key):
        with ngw_core_settings_override([
            (comp, key, None),
        ]):
            yield
    return wrapped


@pytest.mark.parametrize('api_key, comp, setting_key, key, value', (
    ('cors', 'pyramid', 'cors_allow_origin', 'allow_origin', ['https://d1.ru', 'https://d2.ru']),
    ('system_name', 'core', 'system.full_name', 'full_name', 'test_sysname'),
    ('home_path', 'pyramid', 'home_path', 'home_path', '/resource/-1'),
))
def test_misc_settings(api_key, comp, setting_key, key, value, override, webtest, ngw_auth_administrator):
    api_url = f'/api/component/pyramid/{api_key}'
    with override(comp, setting_key):
        webtest.put_json(api_url, {key: value}, status=200)
        resp = webtest.get(api_url, status=200)
        assert resp.json[key] == value


def test_custom_css(override, webtest, ngw_auth_administrator):
    api_url = '/api/component/pyramid/custom_css'
    value = 'any text'
    with override('custom_css'):
        webtest.put(api_url, value, status=200)

        resp = webtest.get(api_url, status=200)
        assert resp.text == value

        resp = webtest.get(api_url, dict(format='json'), status=200)
        assert resp.json == value
