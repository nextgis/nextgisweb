from contextlib import contextmanager
from copy import deepcopy

import pytest

from nextgisweb.env import Component
from nextgisweb.env.test import genereate_components

pytestmark = pytest.mark.usefixtures("ngw_auth_administrator")


@pytest.fixture(scope="module")
def webtest(ngw_webtest_factory):
    return ngw_webtest_factory()


def test_route(webtest):
    webtest.get("/api/component/pyramid/route")


def test_pkg_version(webtest):
    webtest.get("/api/component/pyramid/pkg_version")


def test_healthcheck(webtest):
    webtest.get("/api/component/pyramid/healthcheck")


def test_malformed_json(webtest):
    # Login uses request.json_body
    resp = webtest.post(
        "/api/component/auth/login",
        params="{ /* INVALID JSON */ }",
        content_type="application/json",
        status=400,
    )
    assert resp.json["exception"].endswith(".MalformedJSONBody")

    # Resource APIs use Msgspec
    resp = webtest.put(
        "/api/resource/0",
        params="{ /* INVALID JSON */ }",
        content_type="application/json",
        status=400,
    )
    assert resp.json["exception"].endswith(".MalformedJSONBody")


@pytest.mark.parametrize("component", genereate_components())
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


def test_csettings(webtest):
    url = "/api/component/pyramid/csettings"
    orig = webtest.get(f"{url}?pyramid=all").json
    body = deepcopy(orig)
    body["pyramid"].pop("header_logo", None)
    webtest.put_json(url, body)
    resp = webtest.get(f"{url}?pyramid=all").json
    assert resp == orig

    webtest.put_json(url, dict(pyramid=None), status=422)
