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

