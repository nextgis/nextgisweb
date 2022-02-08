from contextlib import contextmanager
from datetime import datetime
from secrets import token_hex, token_urlsafe
from types import SimpleNamespace
from unittest.mock import patch
from urllib.parse import parse_qsl, urlsplit
from uuid import uuid4

import pytest
from freezegun import freeze_time
from requests.exceptions import HTTPError
import transaction

from ...models import DBSession
from ..oauth import OAuthHelper
from ..models import User

CLIENT_ID = token_hex(16)
CLIENT_SECRET = token_urlsafe(16)

ACCESS_TOKEN_LIFETIME = 60
REFRESH_TOKEN_LIFETIME = 1800


@pytest.fixture(scope='module', autouse=True)
def setup_oauth(ngw_env):
    auth = ngw_env.auth
    options = {
        'oauth.enabled': True,
        'oauth.register': True,
        'oauth.client.id': CLIENT_ID,
        'oauth.client.secret': CLIENT_SECRET,
        'oauth.server.password': False,
        'oauth.server.token_endpoint': 'http://oauth/token',
        'oauth.server.auth_endpoint': 'http://oauth/auth',
        'oauth.server.introspection_endpoint': 'http://oauth/introspect',
        'oauth.profile.subject.attr': 'sub',
        'oauth.profile.keyname.attr': 'preferred_username',
    }

    prev_helper = auth.oauth
    with auth.options.override(options):
        auth.oauth = OAuthHelper(auth.options.with_prefix('oauth'))
        yield
    auth.oauth = prev_helper


@pytest.fixture(scope='module', autouse=True)
def cleanup(ngw_env):
    existing = [row.id for row in DBSession.query(User.id)]

    yield

    with transaction.manager:
        for user in User.filter(User.id.notin_(existing)):
            DBSession.delete(user)


@pytest.fixture()
def server_response_mock():
    hooks = []

    class Hook:
        def __init__(self, endpoint, params, response):
            self.endpoint = endpoint
            self.params = params
            self.response = response
            self.counter = 0

    def server_request_interceptor(self, endpoint, params):
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

            hobj.counter += 1
            if isinstance(hobj.response, Exception):
                raise hobj.response
            else:
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
        OAuthHelper, '_server_request',
        new=server_request_interceptor,
    ):
        yield add_hook


@pytest.fixture()
def freezegun():
    with freeze_time() as v:
        yield v


def test_authorization_code(server_response_mock, freezegun, ngw_webtest_app, ngw_env):
    options = ngw_env.auth.options.with_prefix('oauth')

    next_url = "http://localhost/some-location"
    resp = ngw_webtest_app.get('/oauth', params=dict(next=next_url), status=302)
    redirect = resp.headers['Location']
    assert redirect.startswith(options['server.auth_endpoint'])
    redirect_qs = dict(parse_qsl(urlsplit(redirect).query))
    assert redirect_qs['response_type'] == 'code'
    assert redirect_qs['redirect_uri'] == "http://localhost/oauth"
    assert redirect_qs['client_id'] == CLIENT_ID
    state_key = redirect_qs['state']
    state = dict(parse_qsl(ngw_webtest_app.cookies[f'ngw-oastate-{state_key}']))
    assert state['next_url'] == next_url

    oauth_user = "oauth-test"
    oauth_pwd = "oauth-pwd"
    oauth_subject = str(uuid4())
    code = token_urlsafe(16)
    access_token = token_urlsafe(32)
    refresh_token = token_urlsafe(32)

    def introspection_response():
        start_tstamp = int(datetime.utcnow().timestamp())
        return dict(
            exp=start_tstamp + ACCESS_TOKEN_LIFETIME,
            iat=start_tstamp,
            sub=oauth_subject,
            name="OAuth",
            first_name="OAuth",
            family_name="Test",
            preferred_username=oauth_user,
            active=True,
        )

    with server_response_mock(
        'token', dict(grant_type='authorization_code'),
        response=dict(
            access_token=access_token,
            expires_in=ACCESS_TOKEN_LIFETIME,
            refresh_token=refresh_token,
            refresh_expires_in=REFRESH_TOKEN_LIFETIME,
        )
    ), server_response_mock(
        'introspection', dict(token=access_token),
        response=introspection_response()
    ):
        cb_url = f"/oauth?state={state_key}&code={code}"
        resp = ngw_webtest_app.get(cb_url, status=302)
        assert resp.headers['Location'] == next_url

    # Access token will expire and have to be refreshed
    freezegun.tick(ACCESS_TOKEN_LIFETIME + 5)

    access_token_next = token_urlsafe(32)
    refresh_token_next = token_urlsafe(32)

    with server_response_mock(
        'token', dict(grant_type='refresh_token', refresh_token=refresh_token),
        response=dict(
            access_token=access_token_next,
            expires_in=ACCESS_TOKEN_LIFETIME,
            refresh_token=refresh_token_next,
            refresh_expires_in=REFRESH_TOKEN_LIFETIME,
        )
    ):
        user = ngw_webtest_app.get('/api/component/auth/current_user').json

    access_token = access_token_next
    refresh_token = refresh_token_next

    # Refresh token will expire and refresh will fail
    freezegun.tick(REFRESH_TOKEN_LIFETIME + 5)

    with server_response_mock(
        'token', dict(grant_type='refresh_token', refresh_token=refresh_token),
        response=HTTPError(response=SimpleNamespace(
            status_code=401, text="EXPIRED"))
    ):
        ngw_webtest_app.get('/api/component/auth/current_user')

    # Local authentication of the created user

    with transaction.manager:
        User.filter_by(id=user['id']).one().password = 'test-password'

    ngw_webtest_app.post('/api/component/auth/logout')

    with patch.object(ngw_env.auth.oauth, 'local_auth', new=True):
        ngw_webtest_app.post('/api/component/auth/login', dict(
            login=user['keyname'], password='test-password'))
        assert ngw_webtest_app.get('/api/component/auth/current_user').json == user
        ngw_webtest_app.post('/api/component/auth/logout')

    # Disable local authentication for OAuth users

    with patch.object(ngw_env.auth.oauth, 'local_auth', new=False):
        ngw_webtest_app.post('/api/component/auth/login', dict(
            login=user['keyname'], password='test-password'), status=401)

    # Oauth password authentication
    access_token_next = token_urlsafe(32)
    refresh_token_next = token_urlsafe(32)

    with server_response_mock(
        'token', dict(grant_type='password', username=oauth_user, password=oauth_pwd),
        dict(
            access_token=access_token_next,
            refresh_token=refresh_token_next,
            expires_in=ACCESS_TOKEN_LIFETIME,
        )
    ), server_response_mock(
        'introspection', dict(token=access_token_next), introspection_response()
    ), patch.object(ngw_env.auth.oauth, 'password', new=True):
        ngw_webtest_app.post('/api/component/auth/login', dict(
            login=oauth_user, password=oauth_pwd))
        assert ngw_webtest_app.get('/api/component/auth/current_user').json == user
