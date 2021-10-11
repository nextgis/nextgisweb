import pytest
from webtest import TestApp as BaseTestApp
from webtest.http import StopableWSGIServer
from requests import Session as RequestsSession


@pytest.fixture(scope='session')
def ngw_pyramid_config(ngw_env):
    return ngw_env.pyramid.make_app({})


@pytest.fixture(scope='session')
def ngw_wsgi_test_helper(ngw_env, ngw_pyramid_config):
    application = ngw_pyramid_config.make_wsgi_app()
    with WSGITestHelper(ngw_env, application) as wsgi_test_helper:
        yield wsgi_test_helper


@pytest.fixture(scope='session')
def ngw_webtest_factory(ngw_wsgi_test_helper):
    def _factory():
        return ngw_wsgi_test_helper.webtest_app()
    return _factory


@pytest.fixture(scope='session')
def ngw_httptest_factory(ngw_wsgi_test_helper):
    def _factory():
        return ngw_wsgi_test_helper.httptest_app()
    return _factory


@pytest.fixture()
def ngw_webtest_app(ngw_webtest_factory):
    return ngw_webtest_factory()


@pytest.fixture()
def ngw_httptest_app(ngw_wsgi_test_helper):
    return ngw_wsgi_test_helper.httptest_app()


class WSGITestHelper(object):

    def __init__(self, environment, application):
        self.environment = environment
        self.application = application
        self._http_server = None

    def webtest_app(self):
        return WebTestApp(self.application)

    def httptest_app(self):
        return HTTPTestApp(self.http_server)

    def __enter__(self):
        return self

    def __exit__(self, *args):
        if self.http_server is not None:
            self._http_server.shutdown()
            self._http_server = None

    @property
    def http_server(self):
        if self._http_server is None:
            self._http_server = StopableWSGIServer.create(
                self.application,
                clear_untrusted_proxy_headers=True)
        return self._http_server


class WebTestApp(BaseTestApp):
    pass


class HTTPTestApp(RequestsSession):

    def __init__(self, http_server):
        super().__init__()
        self.http_server = http_server
        self.application_url = http_server.application_url

    @property
    def base_url(self):
        return self.application_url.strip('/')

    def request(self, method, url, *args, **kwargs):
        if url.startswith('/'):
            url = self.application_url.strip('/') + url

        return super().request(
            method, url, *args, **kwargs)
