from warnings import warn
from contextlib import contextmanager

import pytest


def _env_initialize():
    import nextgisweb.env
    result = nextgisweb.env.env()
    if result:
        return result
    result = nextgisweb.env.Env()
    result.initialize()
    nextgisweb.env.setenv(result)
    return result


@pytest.fixture(scope='session')
def ngw_env():
    return _env_initialize()


@pytest.fixture(scope='session')
def env(ngw_env):
    warn("Fixture env is deprecated! Use ngw_env instead.", DeprecationWarning)
    return ngw_env


@pytest.fixture
def txn(ngw_txn):
    warn("Fixture txn is deprecated! Use ngw_txn instead.", DeprecationWarning)
    return ngw_txn


@pytest.fixture(scope='session')
def webapp(ngw_webtest_factory):
    warn("Fixture webapp is deprecated! Use ngw_webtest_app instead.", DeprecationWarning)
    return ngw_webtest_factory()


@pytest.fixture()
def webapp_handler(ngw_env):
    pyramid = ngw_env.pyramid

    @contextmanager
    def _decorator(handler):
        assert pyramid.test_request_handler is None
        try:
            pyramid.test_request_handler = handler
            yield
        finally:
            pyramid.test_request_handler = None

    yield _decorator
    pyramid.test_request_handler = None

