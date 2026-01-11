__all__ = [
    "ngw_current_request",
    "ngw_data_path",
    "ngw_env",
    "ngw_skip_disabled_component",
    "ngw_sql_compare",
]

from collections.abc import Sequence
from functools import cache
from pathlib import Path

import pytest


def pytest_addoption(parser):
    parser.addoption(
        "--ngw-update-refs",
        action="store_true",
        default=False,
        help="Update reference data, like SQL queries",
    )


@pytest.fixture(autouse=True)
def ngw_current_request(request):
    from nextgisweb.env.test import current_request

    token = current_request.set(request)
    try:
        yield
    finally:
        current_request.reset(token)


@pytest.fixture(autouse=True)
def ngw_skip_disabled_component(request):
    if "ngw_env" not in request.fixturenames:
        return

    from nextgisweb.env.package import pkginfo

    ngw_env = request.getfixturevalue("ngw_env")
    comp = pkginfo.component_by_module(request.module.__name__)
    if comp and comp not in ngw_env.components:
        pytest.skip(f"{comp} disabled")


@cache
def _env():
    from nextgisweb.env.environment import Env, env

    result = env() or Env(set_global=True)
    result.running_tests = True
    return result


@pytest.fixture(scope="session")
def ngw_env():
    env = _env()
    if not env.initialized:
        env.initialize()
    return env


@cache
def generate_components() -> Sequence[str]:
    """Return a sequence of enabled component IDs in the test environment. This
    can be used during the test generation stage, for example, to generate
    per-component tests:

    .. code-block:: python

        @pytest.mark.parametrize("component", generate_components()) def
        test_component(component):
            ...
    """
    return tuple(c.identity for c in _env().chain("initialize"))


@pytest.fixture(scope="module")
def ngw_data_path(request) -> Path:
    parent = request.path.parent
    assert parent.name == "test"
    result = parent / "data"
    assert result.is_dir()
    return result


@pytest.fixture(scope="session", autouse=True)
def ngw_sql_compare(request):
    from nextgisweb.env.test import sql_compare

    update_refs = request.config.getoption("--ngw-update-refs")
    setattr(sql_compare, "update", update_refs)
