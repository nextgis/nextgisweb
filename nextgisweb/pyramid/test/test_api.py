from contextlib import contextmanager
from copy import deepcopy

import pytest

from nextgisweb.env import Component

from nextgisweb.pyramid.test import WebTestApp
from nextgisweb.pytest.env import generate_components

pytestmark = pytest.mark.usefixtures("ngw_auth_administrator")


def test_route(ngw_webtest_app: WebTestApp):
    ngw_webtest_app.get("/api/component/pyramid/route")


def test_pkg_version(ngw_webtest_app: WebTestApp):
    ngw_webtest_app.get("/api/component/pyramid/pkg_version")


def test_healthcheck(ngw_disable_oauth, ngw_webtest_app: WebTestApp):
    ngw_webtest_app.get("/api/component/pyramid/healthcheck")


def test_malformed_json(ngw_webtest_app: WebTestApp):
    # Login uses request.json_body
    resp = ngw_webtest_app.post(
        "/api/component/auth/login",
        data="{ /* INVALID JSON */ }",
        headers={"Content-Type": "application/json"},
        status=400,
    )
    assert resp.json["exception"].endswith(".MalformedJSONBody")

    # Resource APIs use Msgspec
    resp = ngw_webtest_app.put(
        "/api/resource/0",
        data="{ /* INVALID JSON */ }",
        headers={"Content-Type": "application/json"},
        status=400,
    )
    assert resp.json["exception"].endswith(".MalformedJSONBody")


@pytest.mark.parametrize("component", generate_components())
def test_settings(component, ngw_webtest_app: WebTestApp):
    if hasattr(Component.registry[component], "client_settings"):
        ngw_webtest_app.get(
            "/api/component/pyramid/settings",
            query={"component": component},
        )


def test_settings_param_required(ngw_webtest_app: WebTestApp):
    ngw_webtest_app.get(
        "/api/component/pyramid/settings",
        status=422,
    )


def test_settings_param_invalid(ngw_webtest_app: WebTestApp):
    ngw_webtest_app.get(
        "/api/component/pyramid/settings",
        query={"component": "invalid"},
        status=422,
    )


@pytest.fixture()
def override(ngw_core_settings_override):
    @contextmanager
    def wrapped(comp, key):
        with ngw_core_settings_override([(comp, key, None)]):
            yield

    return wrapped


def test_csettings(ngw_webtest_app: WebTestApp):
    url = "/api/component/pyramid/csettings"
    orig = ngw_webtest_app.get(url, query={"pyramid": "all"}).json
    body = deepcopy(orig)
    body["pyramid"].pop("header_logo", None)
    ngw_webtest_app.put(url, json=body)
    resp = ngw_webtest_app.get(url, query={"pyramid": "all"}).json
    assert resp == orig

    ngw_webtest_app.put(url, json={"pyramid": None}, status=422)
