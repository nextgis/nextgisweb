from unittest.mock import patch

import pytest
import transaction
from pyramid.interfaces import ISecurityPolicy

from ..model import User
from ..policy import AuthMedium, AuthProvider, AuthResult


@pytest.fixture()
def ngw_auth_administrator(ngw_pyramid_config):
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
    with transaction.manager:
        admin = User.by_keyname("administrator")
        mem = admin.password_hash
        admin.password = "admin"

    yield

    with transaction.manager:
        User.by_keyname("administrator").password_hash = mem


@pytest.fixture()
def disable_oauth(ngw_env):
    auth = ngw_env.auth

    prev_helper = auth.oauth
    with auth.options.override({"oauth.enabled": False}):
        auth.oauth = None
        yield
    auth.oauth = prev_helper
