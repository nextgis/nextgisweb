from contextlib import contextmanager
from copy import deepcopy

import pytest

from nextgisweb.env import Component, load_all

pytestmark = pytest.mark.usefixtures("ngw_auth_administrator")


def pytest_generate_tests(metafunc):
    if "component" in metafunc.fixturenames:
        load_all()
        metafunc.parametrize("component", Component.registry.keys())


@pytest.fixture(scope="module")
def webtest(ngw_webtest_factory):
    return ngw_webtest_factory()


def test_route(webtest):
    webtest.get("/api/component/pyramid/route")


def test_pkg_version(webtest):
    webtest.get("/api/component/pyramid/pkg_version")


def test_healthcheck(webtest):
    webtest.get("/api/component/pyramid/healthcheck")


def test_settings(component, webtest):
    if hasattr(Component.registry[component], "client_settings"):
        webtest.get("/api/component/pyramid/settings?component={}".format(component))


def test_settings_param_required(webtest):
    webtest.get("/api/component/pyramid/settings", status=422)


def test_settings_param_invalid(webtest):
    webtest.get("/api/component/pyramid/settings?component=invalid", status=422)


@pytest.fixture()
def override(ngw_core_settings_override):
    @contextmanager
    def wrapped(comp, key):
        with ngw_core_settings_override(
            [
                (comp, key, None),
            ]
        ):
            yield

    return wrapped


@pytest.mark.parametrize(
    "api_key, comp, setting_key, key, value",
    (
        ("system_name", "core", "system.full_name", "full_name", "test_sysname"),
        ("home_path", "pyramid", "home_path", "home_path", "/resource/-1"),
    ),
)
def test_misc_settings(api_key, comp, setting_key, key, value, override, webtest):
    api_url = f"/api/component/pyramid/{api_key}"
    with override(comp, setting_key):
        webtest.put_json(api_url, {key: value}, status=200)
        resp = webtest.get(api_url, status=200)
        assert resp.json[key] == value


def test_csettings(webtest):
    url = "/api/component/pyramid/csettings"
    orig = webtest.get(f"{url}?pyramid=all").json
    body = deepcopy(orig)
    body["pyramid"].pop("header_logo", None)
    webtest.put_json(url, body)
    resp = webtest.get(f"{url}?pyramid=all").json
    assert resp == orig

    webtest.put_json(url, dict(pyramid=None), status=422)
