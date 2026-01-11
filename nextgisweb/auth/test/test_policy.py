from datetime import timedelta

import pytest
import transaction
from freezegun import freeze_time

from nextgisweb.pyramid.test import WebTestApp

from .. import User

pytestmark = pytest.mark.usefixtures("ngw_disable_oauth", "ngw_administrator_password")


def test_fixture(ngw_webtest_app: WebTestApp, ngw_auth_administrator):
    resp = ngw_webtest_app.get("/api/component/auth/current_user", status=200)
    assert resp.json["keyname"] == "administrator"


def test_http_basic(ngw_webtest_app: WebTestApp):
    ngw_webtest_app.get("/api/component/auth/user/", status=403)

    ngw_webtest_app.authorization = ("Basic", ("administrator", "admin"))
    resp = ngw_webtest_app.get("/api/component/auth/current_user", status=200)
    assert resp.json["keyname"] == "administrator"

    ngw_webtest_app.authorization = ("Basic", ("administrator", "invalid"))
    ngw_webtest_app.get("/api/component/auth/current_user", status=401)


def test_api_login_logout(ngw_webtest_app: WebTestApp):
    resp = ngw_webtest_app.post(
        "/api/component/auth/login",
        json={"login": "administrator", "password": "admin"},
        status=200,
    )
    assert resp.json["keyname"] == "administrator"

    ngw_webtest_app.get("/api/component/auth/user/", status=200)

    resp = ngw_webtest_app.post("/api/component/auth/logout")
    assert resp.json == dict()
    ngw_webtest_app.get("/api/component/auth/user/", status=403)


def test_local_refresh(ngw_webtest_app: WebTestApp, ngw_env):
    lifetime = ngw_env.auth.options["policy.local.lifetime"]
    refresh = ngw_env.auth.options["policy.local.refresh"]
    epsilon = timedelta(seconds=5)

    with freeze_time() as dt:
        start = dt()

        ngw_webtest_app.post(
            "/api/component/auth/login",
            json={"login": "administrator", "password": "admin"},
            status=200,
        )

        dt.tick(lifetime + epsilon)
        ngw_webtest_app.get("/api/component/auth/user/", status=403)

        dt.move_to(start)
        dt.tick(refresh)
        ngw_webtest_app.get("/api/component/auth/user/", status=200)

        dt.tick(lifetime - epsilon)
        ngw_webtest_app.get("/api/component/auth/user/", status=200)


@pytest.fixture
def user():
    with transaction.manager:
        user = User.test_instance().persist()
    yield user


def test_forget_user(ngw_webtest_factory, user):
    app1 = ngw_webtest_factory()
    app1.authorization = ("Basic", ("administrator", "admin"))

    app2 = ngw_webtest_factory()
    app2.post(
        "/api/component/auth/login",
        json={"login": user.keyname, "password": user.password_plaintext},
    )
    resp = app2.get("/api/component/auth/current_user")
    assert resp.json["keyname"] == user.keyname

    app1.put(
        f"/api/component/auth/user/{user.id}",
        json={"password": User.test_instance().password_plaintext},
    )

    resp = app2.get("/api/component/auth/current_user")
    assert resp.json["keyname"] == "guest"
