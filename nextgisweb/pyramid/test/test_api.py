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
