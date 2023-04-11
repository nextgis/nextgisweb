import pytest
from unittest.mock import patch

from pyramid.interfaces import ISecurityPolicy

from ..policy import AuthResult, AuthProvider, AuthMedium
from ..model import User


@pytest.fixture()
def ngw_auth_administrator(ngw_pyramid_config):
    policy = ngw_pyramid_config.registry.getUtility(ISecurityPolicy)

    def _policy_authenticate(request):
        return AuthResult(
            User.by_keyname('administrator').id,
            AuthMedium.SESSION, AuthProvider.LOCAL_PW)

    with patch.object(policy, '_authenticate_request', _policy_authenticate):
        yield
