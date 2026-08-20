from unittest.mock import patch

__all__ = [
    "ngw_httptest_app",
    "ngw_httptest_factory",
    "ngw_pyramid_config",
    "ngw_request_handler",
    "ngw_webtest_app",
    "ngw_webtest_factory",
    "ngw_wsgi_test_helper",
]

from contextlib import contextmanager

import pytest


@pytest.fixture(scope="session")
def ngw_pyramid_config(ngw_env):
    yield ngw_env.pyramid.make_app({})


@pytest.fixture(scope="session")
def ngw_wsgi_test_helper(ngw_env, ngw_pyramid_config):
    from nextgisweb.pyramid.test import WSGITestHelper

    application = ngw_pyramid_config.make_wsgi_app()
    with WSGITestHelper(ngw_env, application) as wsgi_test_helper:
        yield wsgi_test_helper


@pytest.fixture(scope="session")
def ngw_webtest_factory(ngw_wsgi_test_helper):
    def _factory():
        return ngw_wsgi_test_helper.webtest_app()

    return _factory


@pytest.fixture(scope="session")
def ngw_httptest_factory(ngw_wsgi_test_helper):
    def _factory():
        return ngw_wsgi_test_helper.httptest_app()

    return _factory


@pytest.fixture()
def ngw_webtest_app(ngw_webtest_factory):
    yield ngw_webtest_factory()


@pytest.fixture()
def ngw_httptest_app(ngw_wsgi_test_helper):
    app = ngw_wsgi_test_helper.httptest_app()
    yield app
    app.close()


@pytest.fixture()
def ngw_request_handler(ngw_env):
    @contextmanager
    def mock(handler):
        with patch(
            "nextgisweb.pyramid.view.test_request",
            autospec=True,
            side_effect=handler,
        ) as mock:
            yield
            mock.assert_called()

    return mock
