from unittest.mock import patch

import pytest
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
