from contextlib import contextmanager

import pytest

from nextgisweb.env.package import pkginfo


@pytest.fixture(autouse=True)
def ngw_skip_disabled_component(request):
    if "ngw_env" in request.fixturenames:
        ngw_env = request.getfixturevalue("ngw_env")
        comp = pkginfo.component_by_module(request.module.__name__)
        if comp and comp not in ngw_env.components:
            pytest.skip(f"{comp} disabled")


def _env_initialize():
    from .env import Env, env

    result = env()
    if result:
        return result
    result = Env(initialize=True, set_global=True)
    return result


@pytest.fixture(scope="session")
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
