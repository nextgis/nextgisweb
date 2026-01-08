from datetime import datetime, timedelta
from itertools import product
from urllib.parse import parse_qs, urlparse

import pytest
import transaction
from freezegun import freeze_time

from nextgisweb.auth import Group, User
from nextgisweb.pyramid.test import WebTestApp


@pytest.fixture(scope="module", autouse=True)
def _set_options(ngw_env):
    auth = ngw_env.auth

    prev_helper = auth.oauth
    with auth.options.override(
        {
            "oauth.enabled": False,
            "user_limit": None,
            "user_limit_local": None,
        }
    ):
        auth.oauth = None
        yield
    auth.oauth = prev_helper


@pytest.fixture
def uapi(ngw_webtest_app: WebTestApp):
    return ngw_webtest_app.with_url("/api/component/auth/user/")


@pytest.fixture
def gapi(ngw_webtest_app: WebTestApp):
    return ngw_webtest_app.with_url("/api/component/auth/group/")


@pytest.fixture()
def user():
    with transaction.manager:
        user = User.test_instance().persist()
    yield user


@pytest.fixture()
def group():
    with transaction.manager:
        group = Group.test_instance().persist()
    yield group


def _test_current_user(
    ngw_webtest_app: WebTestApp,
    keyname,
    *,
    auth_medium=None,
    auth_provider=None,
):
    res = ngw_webtest_app.get("/api/component/auth/current_user").json
    assert res["keyname"] == keyname
    assert auth_medium is None or (res["auth_medium"] == auth_medium)
    assert auth_provider is None or (res["auth_provider"] == auth_provider)


def test_login_logout(user, ngw_webtest_app: WebTestApp, ngw_env):
    sid_cookie = ngw_env.pyramid.options["session.cookie.name"]

    _test_current_user(ngw_webtest_app, "guest")

    ngw_webtest_app.post(
        "/api/component/auth/login",
        data={"login": user.keyname, "missing": "password"},
        status=422,
    )

    ngw_webtest_app.post(
        "/api/component/auth/login",
        data={"login": user.keyname, "password": "invalid"},
        status=401,
    )

    ngw_webtest_app.post(
        "/api/component/auth/login",
        data={"login": user.keyname, "password": user.password_plaintext},
        status=200,
    )

    _test_current_user(
        ngw_webtest_app,
        user.keyname,
        auth_medium="session",
        auth_provider="local_pw",
    )

    assert sid_cookie in ngw_webtest_app.cookies, "Login must create a session"

    ngw_webtest_app.post("/api/component/auth/logout", status=200)
    _test_current_user(ngw_webtest_app, "guest")

    ngw_webtest_app.post(
        "/api/component/auth/login",
        json={"login": user.id, "password": user.password_plaintext},
        status=422,
    )

    ngw_webtest_app.post(
        "/api/component/auth/login",
        json={"login": user.keyname, "password": user.password_plaintext},
        status=200,
    )
    _test_current_user(ngw_webtest_app, user.keyname)

    ngw_webtest_app.post(
        "/api/component/auth/logout",
        status=200,
    )

    _test_current_user(ngw_webtest_app, "guest")
    assert sid_cookie not in ngw_webtest_app.cookies, "Logout must invalidate the session"


def test_login_no_password(user, ngw_webtest_app: WebTestApp):
    with transaction.manager:
        User.filter_by(id=user.id).one().password = None

    ngw_webtest_app.post(
        "/api/component/auth/login",
        json={"login": user.keyname, "password": "foo"},
        status=401,
    )


def test_session_invite(user, ngw_webtest_app: WebTestApp, ngw_env):
    sid_cookie = ngw_env.pyramid.options["session.cookie.name"]

    with transaction.manager:
        url = ngw_env.auth.session_invite(user.keyname, "https://no-matter/some/path")
    result = urlparse(url)

    query = parse_qs(result.query)
    sid = query["sid"][0]
    expires = query["expires"][0]
    expires_dt = datetime.fromisoformat(expires)
    next_url = query["next"][0]
    assert next_url == "/some/path"

    ngw_webtest_app.post(
        "/api/component/auth/login",
        json={"login": user.keyname, "password": user.password_plaintext},
    )
    assert sid_cookie in ngw_webtest_app.cookies
    assert ngw_webtest_app.cookies[sid_cookie] != sid
    _test_current_user(ngw_webtest_app, user.keyname)

    ngw_webtest_app.post(
        "/session-invite",
        data={"sid": sid + "invalid", "expires": expires},
        status=401,
    )

    ngw_webtest_app.post(
        "/session-invite",
        data={"sid": sid, "expires": expires_dt + timedelta(seconds=1)},
        status=401,
    )

    with freeze_time(expires_dt + timedelta(seconds=1)):
        ngw_webtest_app.post(
            "/session-invite",
            data={"sid": sid, "expires": expires},
            status=401,
        )

    with freeze_time(expires_dt - timedelta(minutes=5)):
        ngw_webtest_app.post(
            "/session-invite",
            data={"sid": sid, "expires": expires},
            status=302,
        )

    assert sid_cookie in ngw_webtest_app.cookies
    assert ngw_webtest_app.cookies[sid_cookie] == sid
    _test_current_user(
        ngw_webtest_app,
        user.keyname,
        auth_medium="session",
        auth_provider="invite",
    )

    ngw_webtest_app.get("/logout", status=302)
    assert sid_cookie not in ngw_webtest_app.cookies
    _test_current_user(ngw_webtest_app, "guest")

    # Invite can be used only once
    ngw_webtest_app.post(
        "/session-invite",
        data={"sid": sid, "expires": expires},
        status=401,
    )


def _user_data():
    obj = User.test_instance()
    return {
        "keyname": obj.keyname,
        "display_name": obj.display_name,
        "password": obj.password_plaintext,
        "disabled": bool(obj.disabled),
    }


@pytest.mark.usefixtures("disable_users", "ngw_auth_administrator")
def test_user_limit(ngw_env, uapi: WebTestApp):
    with ngw_env.auth.options.override(dict(user_limit=2)):
        u1_id = uapi.post(json=_user_data(), status=201).json["id"]
        uapi.post(json=_user_data(), status=422)
        uapi.put(u1_id, json={"disabled": True})
        uapi.post(json=_user_data(), status=201)
        uapi.post(json=_user_data(), status=422)


@pytest.mark.usefixtures("disable_users", "ngw_auth_administrator")
def test_user_over_limit(ngw_env, uapi: WebTestApp):
    u1_id = uapi.post(json=_user_data(), status=201).json["id"]
    uapi.post(json=_user_data())

    with ngw_env.auth.options.override(dict(user_limit=2)):
        uapi.put(u1_id, json={"display_name": "Test user1 name"}, status=200)
        uapi.put(u1_id, json={"disabled": True}, status=200)
        uapi.put(u1_id, json={"disabled": False}, status=422)

    with ngw_env.auth.options.override(dict(user_limit=3)):
        uapi.put(u1_id, json={"disabled": False}, status=200)


@pytest.mark.usefixtures("disable_users", "ngw_auth_administrator")
def test_user_limit_local(uapi: WebTestApp, ngw_env):
    admin = User.filter_by(keyname="administrator").one()
    limit = 2 if admin.password_hash is not None else 1
    with ngw_env.auth.options.override(dict(user_limit_local=limit)):
        u1_id = uapi.post(json=_user_data(), status=201).json["id"]
        uapi.post(json=_user_data(), status=422)
        uapi.put(u1_id, json={"disabled": True})
        uapi.post(json=_user_data(), status=201)
        uapi.post(json=_user_data(), status=422)
        uapi.post(json={**_user_data(), "password": False}, status=201)
        uapi.put(u1_id, json={"disabled": False}, status=422)


@pytest.mark.usefixtures("ngw_auth_administrator")
def test_unique(uapi: WebTestApp, gapi: WebTestApp):
    u1 = _user_data()
    u1["id"] = uapi.post(json=u1, status=201).json["id"]

    u2 = _user_data()
    u2["keyname"] = u1["keyname"].swapcase()
    u2["display_name"] = u1["display_name"].swapcase()
    uapi.post(json=u2, status=422)

    u2["keyname"] = User.test_instance().keyname
    uapi.post(json=u2, status=422)

    u2["display_name"] = User.test_instance().display_name
    u2["id"] = uapi.post(json=u2, status=201).json["id"]

    g1_obj = Group.test_instance()
    g1 = dict(keyname=g1_obj.keyname, display_name=g1_obj.display_name)
    g1["id"] = gapi.post(json=g1, status=201).json["id"]

    g2 = dict(keyname=g1_obj.keyname.swapcase(), display_name=g1_obj.display_name.swapcase())
    gapi.post(json=g2, status=422)

    g2["keyname"] = Group.test_instance().keyname
    gapi.post(json=g2, status=422)

    g2["display_name"] = Group.test_instance().display_name
    g2["id"] = gapi.post(json=g2, status=201).json["id"]


@pytest.mark.parametrize(
    "keyname, ok",
    (
        pytest.param("simple", True, id="simple"),
        pytest.param("snake-case", True, id="snake"),
        pytest.param("kebab_case", True, id="kebab"),
        pytest.param("Keyname1", True, id="wdigit"),
        pytest.param("1Keyname", False, id="fdigit"),
        pytest.param("user@localhost", False, id="email"),
        pytest.param("Юникод", False, id="unicode"),
        pytest.param("ASCII_Юникод", False, id="mixed"),
    ),
)
@pytest.mark.usefixtures("ngw_auth_administrator")
def test_keyname(keyname, ok, user, group, uapi: WebTestApp, gapi: WebTestApp):
    data = dict(keyname=keyname)
    uapi.put(user.id, json=data, status=200 if ok else 422)
    gapi.put(group.id, json=data, status=200 if ok else 422)


@pytest.fixture(scope="class")
def group_members():
    with transaction.manager:
        admins = Group.filter_by(keyname="administrators").one()
        remember = [u.id for u in admins.members]
        admins.members = [u for u in admins.members if u.keyname != "guest"]

    yield

    with transaction.manager:
        admins = Group.filter_by(keyname="administrators").one()
        admins.members = [u for u in User.filter(User.id.in_(remember))]


class TestSystemPrincipal:
    @staticmethod
    def system_user_params():
        for k in ("guest", "authenticated", "everyone", "owner"):
            for t, data, ok in (
                ("empty", dict(), True),
                ("equal", dict(keyname=k), True),
                ("edit", dict(display_name=k.upper()), False),
                ("member_of", dict(member_of=["administrators"]), k == "guest"),
            ):
                yield pytest.param(k, data, ok, id=f"{k}-{t}")

    @pytest.mark.parametrize("keyname, data, ok", system_user_params())
    @pytest.mark.usefixtures("group_members", "ngw_auth_administrator")
    def test_system_user(
        self,
        keyname,
        data,
        ok,
        uapi: WebTestApp,
    ):
        user = User.by_keyname(keyname)
        if "member_of" in data:
            data["member_of"] = [g.id for g in Group.filter(Group.keyname.in_(data["member_of"]))]
        uapi.put(user.id, json=data, status=200 if ok else 422)

    @staticmethod
    def system_group_params():
        p = pytest.param
        yield p(dict(), None, True, id="empty")
        yield p(dict(keyname="administrators"), None, True, id="equal")
        yield p(dict(display_name="ADMINS!"), None, False, id="edit")
        for k in ("guest", "authenticated", "everyone", "owner"):
            yield p(dict(), k, k == "guest", id=f"members-{k}")

    @pytest.mark.parametrize("data, member_add, ok", system_group_params())
    @pytest.mark.usefixtures("ngw_auth_administrator")
    def test_system_group(
        self,
        data,
        member_add,
        ok,
        gapi: WebTestApp,
    ):
        group = Group.filter_by(keyname="administrators").one()
        if member_add is not None:
            data["members"] = [u.id for u in group.members]
            member = User.by_keyname(member_add)
            data["members"].append(member.id)
        gapi.put(group.id, json=data, status=200 if ok else 422)


@pytest.mark.parametrize(
    "password_before, password",
    product(("old", None), ("new", True, False)),
)
@pytest.mark.usefixtures("ngw_auth_administrator")
def test_password(password_before, password, user, uapi: WebTestApp):
    with transaction.manager:
        User.filter_by(id=user.id).one().password = password_before

    ok = not (password is True and password_before is None)

    uapi.put(
        user.id,
        json={"password": password},
        status=200 if ok else 422,
    )

    if not ok:
        return

    password_after = User.filter_by(id=user.id).one().password

    if password is None or password is True:
        assert password_after == password_before
    elif password is False:
        assert password_after is None
    elif isinstance(password, str):
        assert password_after == password
    else:
        raise NotImplementedError()

    resp = uapi.get(user.id, status=200)
    assert resp.json["password"] is (password_after is not None)
