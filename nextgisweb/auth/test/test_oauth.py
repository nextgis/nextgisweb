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
from ..model import User

CLIENT_ID = token_hex(16)
CLIENT_SECRET = token_urlsafe(16)

ACCESS_TOKEN_LIFETIME = 60
REFRESH_TOKEN_LIFETIME = 1800


@pytest.fixture(scope='function', autouse=True)
def setup_oauth(ngw_env, request):
    auth = ngw_env.auth
    options = {
        'oauth.enabled': True,
        'oauth.register': True,
        'oauth.scope': None,
        'oauth.client.id': CLIENT_ID,
        'oauth.client.secret': CLIENT_SECRET,
        'oauth.server.authorization_code': True,
        'oauth.server.password': False,
        'oauth.server.token_endpoint': 'http://oauth/token',
        'oauth.server.auth_endpoint': 'http://oauth/auth',
        'oauth.server.introspection_endpoint': 'http://oauth/introspect',
        'oauth.profile.subject.attr': 'sub',
        'oauth.profile.keyname.attr': None,
        'oauth.profile.display_name.attr': None,
    }
    if hasattr(request, 'param'):
        options.update(request.param)

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


@pytest.mark.parametrize('setup_oauth', [{
    'oauth.profile.keyname.attr': 'preferred_username',
    'oauth.profile.display_name.attr': 'first_name, last_name',
}], indirect=['setup_oauth'])
def test_update_profile(ngw_env, ngw_txn):
    u1 = User(oauth_subject=str(uuid4())).persist()

    with DBSession.no_autoflush:
        ngw_env.auth.oauth._update_user(u1, {
            "preferred_username": "john_doe",
            "first_name": "John",
            "last_name": "Doe"
        })
        DBSession.flush()

    assert u1.keyname == "john_doe"
    assert u1.display_name == "John Doe"

    u2 = User(oauth_subject=str(uuid4())).persist()
    with DBSession.no_autoflush:
        ngw_env.auth.oauth._update_user(u2, {
            "preferred_username": "JOHN_DOE",
            "first_name": "JOHN",
            "last_name": "DOE"
        })
        DBSession.flush()

    assert u2.keyname == "JOHN_DOE_2"
    assert u2.display_name == "JOHN DOE 2"

    u3 = User(oauth_subject=str(uuid4())).persist()
    with DBSession.no_autoflush:
        ngw_env.auth.oauth._update_user(u3, {"preferred_username": "_3"})
        DBSession.flush()

    assert u3.keyname == "u3"
    assert u3.display_name == "u3"


@pytest.mark.parametrize('setup_oauth', [{
    'oauth.profile.keyname.attr': 'preferred_username',
    'oauth.profile.display_name.attr': 'family_name',
}], indirect=['setup_oauth'])
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

    ouser1 = dict(
        sub=str(uuid4()),
        name="Oauth",
        keyname="oauth-test",
        pwd="oauth-pwd",
        first_name="OAuth",
        family_name="Test",
        active=True,
    )
    ouser2 = dict(
        sub=str(uuid4()),
        name="Oauth2",
        keyname="oauth-test2",
        pwd="oauth-secret",
        first_name="OAuthOauth",
        family_name="Test",
        active=True,
    )

    code = token_urlsafe(16)
    access_token = token_urlsafe(32)
    refresh_token = token_urlsafe(32)

    def introspection_response(user):
        start_tstamp = int(datetime.utcnow().timestamp())
        return dict(
            exp=start_tstamp + ACCESS_TOKEN_LIFETIME,
            sub=user['sub'],
            name=user['name'],
            first_name=user['first_name'],
            family_name=user['family_name'],
            preferred_username=user['keyname'],
            active=user['active'],
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
        response=introspection_response(ouser1)
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
    access_token = token_urlsafe(32)
    refresh_token = token_urlsafe(32)

    with server_response_mock(
        'token', dict(grant_type='password', username=ouser1['keyname'], password=ouser1['pwd']),
        dict(
            access_token=access_token,
            refresh_token=refresh_token,
            expires_in=ACCESS_TOKEN_LIFETIME,
            refresh_expires_in=REFRESH_TOKEN_LIFETIME,
        )
    ), server_response_mock(
        'introspection', dict(token=access_token), introspection_response(ouser1)
    ), patch.object(ngw_env.auth.oauth, 'password', new=True):
        ngw_webtest_app.post('/api/component/auth/login', dict(
            login=ouser1['keyname'], password=ouser1['pwd']))
        assert ngw_webtest_app.get('/api/component/auth/current_user').json == user
    ngw_webtest_app.post('/api/component/auth/logout')

    # Bearer authentication
    ngw_webtest_app.authorization = ('Bearer', access_token)

    assert ngw_webtest_app.get('/api/component/auth/current_user').json == user

    freezegun.tick(ACCESS_TOKEN_LIFETIME + 5)
    assert ngw_webtest_app.get('/api/component/auth/current_user', status=401)

    # Register user with bearer authentication
    access_token = token_urlsafe(32)

    ngw_webtest_app.authorization = ('Bearer', access_token)
    with server_response_mock(
        'introspection', dict(token=access_token), introspection_response(ouser2)
    ):
        keyname = ngw_webtest_app.get('/api/component/auth/current_user').json['keyname']
        user2 = User.filter_by(keyname=keyname).one()
        assert user2.display_name == ouser2['family_name'] + '_1'
        assert user2.oauth_subject == ouser2['sub']


@pytest.mark.parametrize('setup_oauth', [{
    'oauth.scope': ['user.read', 'user.write'],
}], indirect=['setup_oauth'])
@pytest.mark.parametrize('scope, ok', (
    (['user.read'], False),
    (['user.read', 'user.write'], True),
    (['user.write', 'user.read', 'other'], True),
))
def test_scope(scope, ok, server_response_mock, ngw_webtest_app):
    resp = ngw_webtest_app.get('/oauth', status=302)
    redirect = resp.headers['Location']
    redirect_qs = dict(parse_qsl(urlsplit(redirect).query))
    state_key = redirect_qs['state']

    code = token_urlsafe(16)
    access_token = token_urlsafe(32)
    refresh_token = token_urlsafe(32)

    start_tstamp = int(datetime.utcnow().timestamp())
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
        response=dict(
            exp=start_tstamp + ACCESS_TOKEN_LIFETIME,
            sub='sub',
            scope=' '.join(scope),
        )
    ):
        cb_url = f"/oauth?state={state_key}&code={code}"
        ngw_webtest_app.get(cb_url, status=302 if ok else 401)


@pytest.mark.parametrize('setup_oauth', [{
    'oauth.server.password': True,
}], indirect=['setup_oauth'])
def test_password_token_basic(server_response_mock, freezegun, ngw_webtest_app):
    access_token = token_urlsafe(32)
    refresh_token = token_urlsafe(32)

    creds = dict(login='chapaev', password=token_urlsafe(4))

    def introspection_response():
        start_tstamp = int(datetime.utcnow().timestamp())
        return dict(exp=start_tstamp + ACCESS_TOKEN_LIFETIME, sub='chapaev')

    with server_response_mock(
        'token', dict(
            grant_type='password',
            username=creds['login'],
            password=creds['password'],
        ),
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
        ngw_webtest_app.authorization = ('Basic', tuple(creds.values()))
        resp = ngw_webtest_app.get('/api/component/auth/current_user', creds).json
        assert resp['keyname'] == 'chapaev'

    # Check caching: it'll fail if server request occurs
    ngw_webtest_app.get('/api/component/auth/current_user', creds)

    # Expire access token, refresh token will be used
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
    ), server_response_mock(
        'introspection', dict(token=access_token_next),
        response=introspection_response()
    ):
        resp = ngw_webtest_app.get('/api/component/auth/current_user', creds).json
        assert resp['keyname'] == 'chapaev'

    # Expire refresh token, new token will be requested
    freezegun.tick(REFRESH_TOKEN_LIFETIME + 5)

    access_token_next = token_urlsafe(32)
    refresh_token_next = token_urlsafe(32)

    with server_response_mock(
        'token', dict(grant_type='password'),
        response=dict(
            access_token=access_token_next,
            expires_in=ACCESS_TOKEN_LIFETIME,
            refresh_token=refresh_token_next,
            refresh_expires_in=REFRESH_TOKEN_LIFETIME,
        )
    ), server_response_mock(
        'introspection', dict(token=access_token_next),
        response=introspection_response()
    ):
        resp = ngw_webtest_app.get('/api/component/auth/current_user', creds).json
        assert resp['keyname'] == 'chapaev'


@pytest.mark.parametrize('setup_oauth', [{
    'oauth.server.password': True,
}], indirect=['setup_oauth'])
def test_password_token_session(server_response_mock, freezegun, ngw_webtest_app):
    access_token = token_urlsafe(32)
    refresh_token = token_urlsafe(32)

    creds = dict(login='vasechkin', password=token_urlsafe(4))

    def introspection_response():
        start_tstamp = int(datetime.utcnow().timestamp())
        return dict(exp=start_tstamp + ACCESS_TOKEN_LIFETIME, sub='vasechkin')

    with server_response_mock(
        'token', dict(grant_type='password'),
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
        ngw_webtest_app.post('/api/component/auth/login', creds)

    # Check caching: it'll fail if server request occurs
    ngw_webtest_app.post('/api/component/auth/logout', creds)
    ngw_webtest_app.post('/api/component/auth/login', creds)

    # Expire access token, refresh token will be used
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
        resp = ngw_webtest_app.get('/api/component/auth/current_user').json
        assert resp['keyname'] == 'vasechkin'

    # Expire refresh token, user will be logged out
    freezegun.tick(REFRESH_TOKEN_LIFETIME + 5)

    with server_response_mock(
        'token', dict(grant_type='refresh_token', refresh_token=refresh_token_next),
        response=HTTPError(response=SimpleNamespace(
            status_code=401, text="EXPIRED"))
    ):
        resp = ngw_webtest_app.get('/api/component/auth/current_user').json
        assert resp['keyname'] == 'guest'
