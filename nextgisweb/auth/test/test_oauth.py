from contextlib import contextmanager, nullcontext
from datetime import datetime, timezone
from secrets import token_hex, token_urlsafe
from unittest.mock import patch
from urllib.parse import parse_qsl, urlsplit
from uuid import uuid4

import pytest
import transaction
from freezegun import freeze_time

from nextgisweb.env import DBSession
from nextgisweb.lib.datetime import utcnow_naive
from nextgisweb.lib.logging import logger

from ..model import Group, User
from ..oauth import OAuthErrorResponse, OAuthHelper, _member_of_from_token

CLIENT_ID = token_hex()
CLIENT_SECRET = token_urlsafe()

ACCESS_TOKEN_LIFETIME = 60
REFRESH_TOKEN_LIFETIME = 1800


@pytest.fixture(scope="function", autouse=True)
def setup_oauth(ngw_env, request):
    auth = ngw_env.auth
    options = {
        "oauth.enabled": True,
        "oauth.register": True,
        "oauth.scope": None,
        "oauth.client.id": CLIENT_ID,
        "oauth.client.secret": CLIENT_SECRET,
        "oauth.server.type": None,
        "oauth.server.authorization_code": True,
        "oauth.server.password": False,
        "oauth.server.token_endpoint": "http://oauth/token",
        "oauth.server.auth_endpoint": "http://oauth/auth",
        "oauth.server.introspection_endpoint": "http://oauth/introspect",
        "oauth.server.userinfo_endpoint": None,
        "oauth.profile.subject.attr": "sub",
        "oauth.profile.keyname.attr": None,
        "oauth.profile.display_name.attr": None,
        "oauth.profile.member_of.attr": None,
    }
    if hasattr(request, "param"):
        options.update(request.param)

    prev_helper = auth.oauth
    with auth.options.override(options):
        auth.oauth = OAuthHelper(auth.options.with_prefix("oauth"))
        yield
    auth.oauth = prev_helper


@pytest.fixture()
def server_response_mock():
    hooks = []

    class Hook:
        def __init__(self, endpoint, params, response):
            self.endpoint = endpoint
            self.params = params
            self.response = response
            self.counter = 0

    def server_request_interceptor(
        self, endpoint, params, *, default_method=None, access_token=None
    ):
        for hobj in hooks:
            if hobj.endpoint != endpoint:
                continue

            match = True
            for k, v in hobj.params.items():
                if k not in params or params[k] != v:
                    match = False
                    break
            if not match:
                continue

            logger.debug(f"{hobj.endpoint} <<< {hobj.params}")

            hobj.counter += 1
            if isinstance(hobj.response, Exception):
                raise hobj.response
            else:
                logger.debug(f"{hobj.endpoint} >>> {hobj.response}")
                return hobj.response

        raise ValueError(f"No hook found for ({endpoint}, {params})")

    @contextmanager
    def add_hook(endpoint, params, response):
        hobj = Hook(endpoint, params, response)
        hooks.append(hobj)
        yield
        assert hobj.counter == 1, "Hook didn't fire or fired more than once"
        hooks.remove(hobj)

    with patch.object(
        OAuthHelper,
        "_server_request",
        new=server_request_interceptor,
    ):
        yield add_hook


@pytest.fixture()
def freezegun():
    with freeze_time() as v:
        yield v


@pytest.mark.parametrize(
    "setup_oauth",
    [
        {
            "oauth.profile.keyname.attr": "preferred_username",
            "oauth.profile.display_name.attr": "first_name, last_name",
        }
    ],
    indirect=True,
)
def test_update_profile(ngw_env, ngw_txn):
    u1 = User(oauth_subject=token_hex()).persist()
    with DBSession.no_autoflush:
        ngw_env.auth.oauth._update_user(
            u1, {"preferred_username": "john_doe", "first_name": "John", "last_name": "Doe"}
        )
        DBSession.flush()

    assert u1.keyname == "john_doe"
    assert u1.display_name == "John Doe"

    u2 = User(oauth_subject=token_hex()).persist()
    with DBSession.no_autoflush:
        ngw_env.auth.oauth._update_user(
            u2, {"preferred_username": "JOHN_DOE", "first_name": "JOHN", "last_name": "DOE"}
        )
        DBSession.flush()

    assert u2.keyname == "JOHN_DOE_2"
    assert u2.display_name == "JOHN DOE 2"

    u3 = User(oauth_subject=token_hex()).persist()
    with DBSession.no_autoflush:
        ngw_env.auth.oauth._update_user(u3, {"preferred_username": "_3"})
        DBSession.flush()

    assert u3.keyname == "u3"
    assert u3.display_name == "u3"


_pg = [(lambda x: x.swapcase() if (i % 2 == 1) else x)(f"group_{token_hex(8)}") for i in range(4)]
_pu = User.test_instance(oauth_subject=token_hex())


@pytest.fixture(scope="function")
def principals():
    groups = (
        (_pg[0], True),
        (_pg[1], False),
        (_pg[2], True),
        (_pg[3], False),
    )
    with transaction.manager:
        user = User(
            keyname=_pu.keyname,
            display_name=_pu.display_name,
            oauth_subject=_pu.oauth_subject,
        ).persist()
        for keyname, oauth_mapping in groups:
            Group(
                keyname=keyname,
                display_name=keyname,
                oauth_mapping=oauth_mapping,
            ).persist()

    yield

    with transaction.manager:
        DBSession.delete(user)
        for keyname, _ in groups:
            DBSession.delete(Group.filter_by(keyname=keyname).one())


@pytest.mark.parametrize(
    "tdata, key, expected",
    (
        pytest.param(dict(simple="role"), "simple", {"role"}, id="simple"),
        pytest.param(
            dict(deep1=dict(deep2=dict(deep3=["role1", "role2"]))),
            "deep1.deep2.deep3",
            {"role1", "role2"},
            id="deep",
        ),
        pytest.param(
            dict(list=[dict(role="role1"), dict(role="role2")]),
            "list.role",
            {"role1", "role2"},
            id="list",
        ),
    ),
)
def test_member_of_parse(tdata, key, expected):
    result = _member_of_from_token(tdata, key)
    assert result == expected


@pytest.mark.parametrize(
    "setup_oauth",
    [{"oauth.profile.member_of.attr": "resource_access.{client_id}.roles"}],
    indirect=True,
)
@pytest.mark.parametrize(
    "roles, result",
    [line for line in [([], {_pg[1]}), ([_pg[2], _pg[3]], {_pg[1], _pg[2]})]],
)
def test_update_member_of(roles, result, ngw_env, ngw_txn, principals):
    user = User.filter_by(keyname=_pu.keyname).one()
    user.member_of = Group.filter(Group.keyname.in_((_pg[0], _pg[1]))).all()

    with DBSession.no_autoflush:
        ngw_env.auth.oauth._update_user(user, {"resource_access": {CLIENT_ID: {"roles": roles}}})

    assert {g.keyname for g in user.member_of} == result


@pytest.mark.parametrize(
    "setup_oauth",
    [
        {
            "oauth.profile.keyname.attr": "preferred_username",
            "oauth.profile.display_name.attr": "family_name",
        }
    ],
    indirect=True,
)
def test_authorization_code(server_response_mock, freezegun, ngw_webtest_app, ngw_env):
    options = ngw_env.auth.options.with_prefix("oauth")

    next_url = "http://localhost/some-location"
    resp = ngw_webtest_app.get("/oauth", params=dict(next=next_url), status=302)
    redirect = resp.headers["Location"]
    assert redirect.startswith(options["server.auth_endpoint"])
    redirect_qs = dict(parse_qsl(urlsplit(redirect).query))
    assert redirect_qs["response_type"] == "code"
    assert redirect_qs["redirect_uri"] == "http://localhost/oauth"
    assert redirect_qs["client_id"] == CLIENT_ID
    state_key = redirect_qs["state"]
    state = dict(parse_qsl(ngw_webtest_app.cookies[f"ngw_oas_{state_key}"]))
    assert state["next_url"] == next_url

    ouser1 = dict(
        sub=str(uuid4()),
        name="Oauth",
        keyname="oauth_test",
        pwd="oauth-pwd",
        first_name="OAuth",
        family_name="Test",
        active=True,
    )
    ouser2 = dict(
        sub=str(uuid4()),
        name="Oauth2",
        keyname="oauth_test2",
        pwd="oauth-secret",
        first_name="OAuthOauth",
        family_name="Test",
        active=True,
    )

    code = token_urlsafe()
    access_token = token_urlsafe()
    refresh_token = token_urlsafe()

    def introspection_response(user):
        start_tstamp = int(utcnow_naive().timestamp())
        return dict(
            exp=start_tstamp + ACCESS_TOKEN_LIFETIME,
            sub=user["sub"],
            name=user["name"],
            first_name=user["first_name"],
            family_name=user["family_name"],
            preferred_username=user["keyname"],
            active=user["active"],
        )

    with (
        server_response_mock(
            "token",
            dict(grant_type="authorization_code"),
            response=dict(
                access_token=access_token,
                expires_in=ACCESS_TOKEN_LIFETIME,
                refresh_token=refresh_token,
                refresh_expires_in=REFRESH_TOKEN_LIFETIME,
            ),
        ),
        server_response_mock(
            "introspection",
            dict(token=access_token),
            response=introspection_response(ouser1),
        ),
    ):
        cb_url = f"/oauth?state={state_key}&code={code}"
        resp = ngw_webtest_app.get(cb_url, status=302)
        assert resp.headers["Location"] == next_url

    # Access token will expire and have to be refreshed
    freezegun.tick(ACCESS_TOKEN_LIFETIME + 5)

    access_token_next = token_urlsafe()
    refresh_token_next = token_urlsafe()

    with server_response_mock(
        "token",
        dict(grant_type="refresh_token", refresh_token=refresh_token),
        response=dict(
            access_token=access_token_next,
            expires_in=ACCESS_TOKEN_LIFETIME,
            refresh_token=refresh_token_next,
            refresh_expires_in=REFRESH_TOKEN_LIFETIME,
        ),
    ):
        user = ngw_webtest_app.get("/api/component/auth/current_user").json
        assert user["keyname"] == ouser1["keyname"]
        assert user["auth_medium"] == "session"
        assert user["auth_provider"] == "oauth_ac"

    access_token = access_token_next
    refresh_token = refresh_token_next

    # Refresh token will expire and refresh will fail
    freezegun.tick(REFRESH_TOKEN_LIFETIME + 5)

    with server_response_mock(
        "token",
        dict(grant_type="refresh_token", refresh_token=refresh_token),
        response=OAuthErrorResponse("expired"),
    ):
        ngw_webtest_app.get("/api/component/auth/current_user")

    # Local authentication of the created user

    with transaction.manager:
        test_password = User.test_instance().password_plaintext
        User.filter_by(id=user["id"]).one().password = test_password

    ngw_webtest_app.post("/api/component/auth/logout")

    with patch.object(ngw_env.auth.oauth, "local_auth", new=True):
        ngw_webtest_app.post(
            "/api/component/auth/login",
            dict(login=user["keyname"], password=test_password),
        )

        user_auth_local = dict(user, auth_provider="local_pw")
        assert ngw_webtest_app.get("/api/component/auth/current_user").json == user_auth_local
        ngw_webtest_app.post("/api/component/auth/logout")

    # Disable local authentication for OAuth users

    with patch.object(ngw_env.auth.oauth, "local_auth", new=False):
        ngw_webtest_app.post(
            "/api/component/auth/login",
            dict(login=user["keyname"], password=test_password),
            status=401,
        )

    # Oauth password authentication
    access_token = token_urlsafe()
    refresh_token = token_urlsafe()

    with (
        server_response_mock(
            "token",
            dict(grant_type="password", username=ouser1["keyname"], password=ouser1["pwd"]),
            dict(
                access_token=access_token,
                refresh_token=refresh_token,
                expires_in=ACCESS_TOKEN_LIFETIME,
                refresh_expires_in=REFRESH_TOKEN_LIFETIME,
            ),
        ),
        server_response_mock(
            "introspection",
            dict(token=access_token),
            introspection_response(ouser1),
        ),
        patch.object(
            ngw_env.auth.oauth,
            "password",
            new=True,
        ),
    ):
        ngw_webtest_app.post(
            "/api/component/auth/login",
            dict(login=ouser1["keyname"], password=ouser1["pwd"]),
        )
        user_auth_provider = dict(user, auth_provider="oauth_pw")
        assert ngw_webtest_app.get("/api/component/auth/current_user").json == user_auth_provider
    ngw_webtest_app.post("/api/component/auth/logout")

    # Bearer authentication
    ngw_webtest_app.authorization = ("Bearer", access_token)

    user_auth_medium = dict(user, auth_medium="bearer")
    assert ngw_webtest_app.get("/api/component/auth/current_user").json == user_auth_medium

    freezegun.tick(ACCESS_TOKEN_LIFETIME + 5)
    assert ngw_webtest_app.get("/api/component/auth/current_user", status=401)

    # Register user with bearer authentication
    access_token = token_urlsafe()

    ngw_webtest_app.authorization = ("Bearer", access_token)
    with server_response_mock(
        "introspection",
        dict(token=access_token),
        introspection_response(ouser2),
    ):
        keyname = ngw_webtest_app.get("/api/component/auth/current_user").json["keyname"]
        user2 = User.filter_by(keyname=keyname).one()
        assert user2.display_name == ouser2["family_name"] + " 2"
        assert user2.oauth_subject == ouser2["sub"]


@pytest.fixture(scope="function")
def local_user():
    with transaction.manager:
        user = User.test_instance().persist()
    yield user


def test_bind(local_user, server_response_mock, ngw_webtest_app):
    ngw_webtest_app.post(
        "/api/component/auth/login",
        dict(login=local_user.keyname, password=local_user.password_plaintext),
    )

    resp = ngw_webtest_app.get("/oauth", params=dict(bind="1"), status=302)
    redirect = resp.headers["Location"]
    redirect_qs = dict(parse_qsl(urlsplit(redirect).query))
    state_key = redirect_qs["state"]

    code = token_urlsafe()
    sub = "sub_" + token_hex()

    def introspection_response():
        start_tstamp = int(datetime.now(timezone.utc).timestamp())
        return dict(exp=start_tstamp + ACCESS_TOKEN_LIFETIME, sub=sub)

    access_token = token_urlsafe()
    refresh_token = token_urlsafe()

    with (
        server_response_mock(
            "token",
            dict(grant_type="authorization_code"),
            response=dict(
                access_token=access_token,
                expires_in=ACCESS_TOKEN_LIFETIME,
                refresh_token=refresh_token,
                refresh_expires_in=REFRESH_TOKEN_LIFETIME,
            ),
        ),
        server_response_mock(
            "introspection",
            dict(token=access_token),
            response=introspection_response(),
        ),
    ):
        cb_url = f"/oauth?state={state_key}&code={code}"
        resp = ngw_webtest_app.get(cb_url, status=302)

    user = User.filter_by(id=local_user.id).one()
    assert user.oauth_subject == sub
    assert user.oauth_tstamp is not None


@pytest.mark.parametrize(
    "setup_oauth",
    [{"oauth.scope": ["user.read", "user.write"]}],
    indirect=True,
)
@pytest.mark.parametrize(
    "scope, ok",
    (
        (["user.read"], False),
        (["user.read", "user.write"], True),
        (["user.write", "user.read", "other"], True),
    ),
)
def test_scope(scope, ok, server_response_mock, ngw_webtest_app):
    resp = ngw_webtest_app.get("/oauth", status=302)
    redirect = resp.headers["Location"]
    redirect_qs = dict(parse_qsl(urlsplit(redirect).query))
    state_key = redirect_qs["state"]

    code = token_urlsafe()
    access_token = token_urlsafe()
    refresh_token = token_urlsafe()

    start_tstamp = int(utcnow_naive().timestamp())
    with (
        server_response_mock(
            "token",
            dict(grant_type="authorization_code"),
            response=dict(
                access_token=access_token,
                expires_in=ACCESS_TOKEN_LIFETIME,
                refresh_token=refresh_token,
                refresh_expires_in=REFRESH_TOKEN_LIFETIME,
            ),
        ),
        server_response_mock(
            "introspection",
            dict(token=access_token),
            response=dict(
                exp=start_tstamp + ACCESS_TOKEN_LIFETIME,
                sub="sub",
                scope=" ".join(scope),
            ),
        ),
    ):
        cb_url = f"/oauth?state={state_key}&code={code}"
        ngw_webtest_app.get(cb_url, status=302 if ok else 401)


@pytest.fixture(scope="function")
def disabled_local_user():
    with transaction.manager:
        user = User.test_instance(disabled=True).persist()
    yield user


@pytest.mark.parametrize("setup_oauth", [{"oauth.server.password": True}], indirect=True)
def test_password_token_basic(
    disabled_local_user, server_response_mock, freezegun, ngw_webtest_app
):
    access_token = token_urlsafe()
    refresh_token = token_urlsafe()
    sub = "sub_" + token_hex()

    creds = dict(login=disabled_local_user.keyname, password=token_urlsafe())

    def introspection_response():
        start_tstamp = int(utcnow_naive().timestamp())
        return dict(
            exp=start_tstamp + ACCESS_TOKEN_LIFETIME,
            refresh_expires_in=REFRESH_TOKEN_LIFETIME,
            sub=sub,
        )

    with (
        server_response_mock(
            "token",
            dict(
                grant_type="password",
                username=creds["login"],
                password=creds["password"],
            ),
            response=dict(
                access_token=access_token,
                expires_in=ACCESS_TOKEN_LIFETIME,
                refresh_token=refresh_token,
                refresh_expires_in=REFRESH_TOKEN_LIFETIME,
            ),
        ),
        server_response_mock(
            "introspection", dict(token=access_token), response=introspection_response()
        ),
    ):
        ngw_webtest_app.authorization = ("Basic", tuple(creds.values()))
        resp = ngw_webtest_app.get("/api/component/auth/current_user", creds).json
        assert resp["keyname"] == sub

    # Check caching: it'll fail if server request occurs
    ngw_webtest_app.get("/api/component/auth/current_user", creds)

    # Expire access token, refresh token will be used
    freezegun.tick(ACCESS_TOKEN_LIFETIME + 5)

    access_token_next = token_urlsafe()
    refresh_token_next = token_urlsafe()

    with (
        server_response_mock(
            "token",
            dict(grant_type="refresh_token", refresh_token=refresh_token),
            response=dict(
                access_token=access_token_next,
                expires_in=ACCESS_TOKEN_LIFETIME,
                refresh_token=refresh_token_next,
                refresh_expires_in=REFRESH_TOKEN_LIFETIME,
            ),
        ),
        server_response_mock(
            "introspection", dict(token=access_token_next), response=introspection_response()
        ),
    ):
        resp = ngw_webtest_app.get("/api/component/auth/current_user", creds).json
        assert resp["keyname"] == sub

    # Expire refresh token, new token will be requested
    freezegun.tick(REFRESH_TOKEN_LIFETIME + 5)

    access_token_next = token_urlsafe()
    refresh_token_next = token_urlsafe()

    with (
        server_response_mock(
            "token",
            dict(grant_type="password"),
            response=dict(
                access_token=access_token_next,
                expires_in=ACCESS_TOKEN_LIFETIME,
                refresh_token=refresh_token_next,
                refresh_expires_in=REFRESH_TOKEN_LIFETIME,
            ),
        ),
        server_response_mock(
            "introspection", dict(token=access_token_next), response=introspection_response()
        ),
    ):
        resp = ngw_webtest_app.get("/api/component/auth/current_user", creds).json
        assert resp["keyname"] == sub


@pytest.mark.parametrize("setup_oauth", [{"oauth.server.password": True}], indirect=True)
def test_password_token_session(server_response_mock, freezegun, ngw_webtest_app):
    access_token = token_urlsafe()
    refresh_token = token_urlsafe()

    user = User.test_instance()
    creds = dict(login=user.keyname, password=user.password_plaintext)
    sub = "sub_" + token_hex()

    def introspection_response():
        start_tstamp = int(utcnow_naive().timestamp())
        return dict(exp=start_tstamp + ACCESS_TOKEN_LIFETIME, sub=sub)

    with (
        server_response_mock(
            "token",
            dict(grant_type="password"),
            response=dict(
                access_token=access_token,
                expires_in=ACCESS_TOKEN_LIFETIME,
                refresh_token=refresh_token,
                refresh_expires_in=REFRESH_TOKEN_LIFETIME,
            ),
        ),
        server_response_mock(
            "introspection", dict(token=access_token), response=introspection_response()
        ),
    ):
        ngw_webtest_app.post("/api/component/auth/login", creds)

    # Check caching: it'll fail if server request occurs
    ngw_webtest_app.post("/api/component/auth/logout", creds)
    ngw_webtest_app.post("/api/component/auth/login", creds)

    # Expire access token, refresh token will be used
    freezegun.tick(ACCESS_TOKEN_LIFETIME + 5)

    access_token_next = token_urlsafe()
    refresh_token_next = token_urlsafe()

    with server_response_mock(
        "token",
        dict(grant_type="refresh_token", refresh_token=refresh_token),
        response=dict(
            access_token=access_token_next,
            expires_in=ACCESS_TOKEN_LIFETIME,
            refresh_token=refresh_token_next,
            refresh_expires_in=REFRESH_TOKEN_LIFETIME,
        ),
    ):
        resp = ngw_webtest_app.get("/api/component/auth/current_user").json
        assert resp["keyname"] == sub

    # Expire refresh token, user will be logged out
    freezegun.tick(REFRESH_TOKEN_LIFETIME + 5)

    with server_response_mock(
        "token",
        dict(grant_type="refresh_token", refresh_token=refresh_token_next),
        response=OAuthErrorResponse("expired"),
    ):
        resp = ngw_webtest_app.get("/api/component/auth/current_user").json
        assert resp["keyname"] == "guest"


@pytest.fixture(scope="function")
def oauth_user():
    with transaction.manager:
        user = User.test_instance(oauth_subject=token_hex()).persist()
    yield user.id


@pytest.mark.parametrize("setup_oauth", [{"oauth.server.sync": True}], indirect=True)
def test_oauth_sync(oauth_user, ngw_auth_administrator, ngw_webtest_app):
    url = f"/api/component/auth/user/{oauth_user}"

    ngw_webtest_app.put_json(url, dict(disabled=True), status=422)
    ngw_webtest_app.delete(url, status=422)

    with transaction.manager:
        User.filter_by(id=oauth_user).one().disabled = True

    ngw_webtest_app.put_json(url, dict(disabled=False), status=422)
    ngw_webtest_app.delete(url, status=200)


@pytest.mark.parametrize(
    "setup_oauth",
    [{"oauth.server.password": True, "oauth.server.userinfo_endpoint": "http://oauth/me"}],
    indirect=True,
)
@pytest.mark.parametrize("user_limit, ok", ((1, False), (2, True)))
def test_register_limit(
    user_limit, ok, ngw_env, server_response_mock, ngw_webtest_app, disable_users
):
    access_token = token_urlsafe()
    refresh_token = token_urlsafe()
    sub = "sub_" + token_hex()

    def introspection_response():
        start_tstamp = int(utcnow_naive().timestamp())
        return dict(exp=start_tstamp + ACCESS_TOKEN_LIFETIME, sub=sub)

    user = User.test_instance()
    creds = dict(login=user.keyname, password=user.password_plaintext)

    if ok:
        userinfo_mock = server_response_mock("userinfo", dict(), response=dict())
    else:
        userinfo_mock = nullcontext()

    with (
        server_response_mock(
            "token",
            dict(grant_type="password"),
            response=dict(
                access_token=access_token,
                expires_in=ACCESS_TOKEN_LIFETIME,
                refresh_token=refresh_token,
                refresh_expires_in=REFRESH_TOKEN_LIFETIME,
            ),
        ),
        server_response_mock(
            "introspection", dict(token=access_token), response=introspection_response()
        ),
        userinfo_mock,
    ):
        with ngw_env.auth.options.override(dict(user_limit=user_limit)):
            ngw_webtest_app.post("/api/component/auth/login", creds, status=200 if ok else 422)
