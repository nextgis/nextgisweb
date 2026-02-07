__all__ = [
    "ngw_administrator_password",
    "ngw_auth_administrator",
    "ngw_disable_oauth",
]

import pytest


@pytest.fixture()
def ngw_disable_oauth(ngw_env):
    auth = ngw_env.auth

    prev_helper = auth.oauth
    with auth.options.override({"oauth.enabled": False}):
        auth.oauth = None
        yield
    auth.oauth = prev_helper


@pytest.fixture()
def ngw_auth_administrator(ngw_env):
    from nextgisweb.auth import User
    from nextgisweb.auth.policy import AM_SESSION, AP_LOCAL_PW, AuthResult

    auth = ngw_env.auth

    def forever_admin(request, *, now):
        return AuthResult(
            User.by_keyname("administrator").id,
            AM_SESSION,
            AP_LOCAL_PW,
        )

    auth.register_auth_method(forever_admin)
    try:
        yield
    finally:
        auth.unregister_auth_method(forever_admin)


@pytest.fixture
def ngw_administrator_password():
    import transaction

    from nextgisweb.auth import User

    with transaction.manager:
        admin = User.by_keyname("administrator")
        mem = admin.password_hash
        admin.password = "admin"

    yield

    with transaction.manager:
        User.by_keyname("administrator").password_hash = mem
