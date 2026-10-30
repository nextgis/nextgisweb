import pytest
import transaction

from nextgisweb.pyramid.test import WebTestApp

from .. import Group, User


@pytest.fixture(scope="module", autouse=True)
def setup(ngw_env):
    with ngw_env.auth.options.override({"alink": True}):
        yield


@pytest.mark.parametrize(
    "user_kw, ok",
    (
        pytest.param({}, True, id="simple"),
        pytest.param({"password": None}, True, id="no-password"),
        pytest.param({"disabled": True}, False, id="disabled"),
        pytest.param({"oauth_subject": "test-alink"}, False, id="oauth"),
        pytest.param({"member_of": ["administrators"]}, False, id="administrator"),
    ),
)
def test_alink(user_kw, ok, ngw_webtest_app: WebTestApp):
    with transaction.manager:
        if "member_of" in user_kw:
            user_kw["member_of"] = Group.filter(Group.keyname.in_(user_kw["member_of"])).all()
        user = User.test_instance(**user_kw).persist()
    user_id = user.id

    api = ngw_webtest_app.with_url(f"/api/component/auth/user/{user_id}")
    ngw_webtest_app.authorization = ("Basic", ("administrator", "admin"))

    api.put(json={"alink": True})

    data = api.get().json
    alink = data["alink"]
    assert alink is not None
    assert data["alink_available"] is ok

    ngw_webtest_app.authorization = None
    resp = ngw_webtest_app.get(f"/alink/{alink}", status="*")
    assert resp.status_code == 302 if ok else 401

    data = ngw_webtest_app.get("/api/component/auth/current_user").json
    if ok:
        assert data["id"] == user_id
    else:
        assert data["keyname"] == "guest"
