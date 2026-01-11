__all__ = [
    "ngw_administrator_password",
    "ngw_auth_administrator",
    "ngw_disable_oauth",
]

from unittest.mock import patch

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
def ngw_auth_administrator(ngw_pyramid_config):
    from pyramid.interfaces import ISecurityPolicy

    from nextgisweb.auth import User
    from nextgisweb.auth.policy import AuthMedium, AuthProvider, AuthResult

    policy = ngw_pyramid_config.registry.getUtility(ISecurityPolicy)

    def _policy_authenticate(request):
        return AuthResult(
            User.by_keyname("administrator").id,
            AuthMedium.SESSION,
            AuthProvider.LOCAL_PW,
        )

    with patch.object(policy, "_authenticate_request", _policy_authenticate):
        yield


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
