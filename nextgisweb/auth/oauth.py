import re
import itertools
from datetime import datetime, timedelta
from collections import namedtuple
from logging import getLogger
from hashlib import sha512
from urllib.parse import urlencode

import sqlalchemy as sa
import requests
import zope.event

from ..env import env
from ..lib.config import OptionAnnotations, Option
from .. import db
from ..models import DBSession
from ..core.exception import UserException

from .models import User, Group, Base
from .exception import UserDisabledException
from .util import _, clean_user_keyname


_logger = getLogger(__name__)

MAX_TOKEN_LENGTH = 250


class OAuthHelper(object):

    def __init__(self, options):
        self.options = options

        self.password = options['server.password']
        self.local_auth = options['local_auth']

        self.server_headers = {}
        if 'server.authorization_header' in options:
            self.server_headers['Authorization'] = options['server.authorization_header']

    def authorization_code_url(self, redirect_uri, **kwargs):
        # TODO: Implement scope support

        qs = dict(
            response_type='code',
            redirect_uri=redirect_uri,
            **kwargs)

        if 'client.id' in self.options:
            qs['client_id'] = self.options['client.id']

        return self.options['server.auth_endpoint'] + '?' + urlencode(qs)

    def grant_type_password(self, username, password):
        # TODO: Implement scope support

        return self._token_request('password', dict(
            username=username,
            password=password))

    def grant_type_authorization_code(self, code, redirect_uri):
        # TODO: Implement scope support

        return self._token_request('authorization_code', dict(
            redirect_uri=redirect_uri, code=code))

    def grant_type_refresh_token(self, refresh_token, access_token):
        try:
            return self._token_request('refresh_token', dict(
                refresh_token=refresh_token,
                access_token=access_token))
        except requests.HTTPError as exc:
            if 400 <= exc.response.status_code <= 403:
                _logger.debug("Token refresh failed: %s", exc.response.text)
                raise OAuthTokenRefreshException()
            raise exc

    def query_introspection(self, access_token):
        if len(access_token) > MAX_TOKEN_LENGTH:
            token_id = 'sha512:' + sha512(access_token.encode('utf-8')).hexdigest()
        else:
            token_id = 'raw:' + access_token

        with DBSession.no_autoflush:
            token = OAuthToken.filter_by(id=token_id).first()

        if token is not None:
            _logger.debug("Access token was read from cache (%s)", access_token)
        else:
            try:
                tdata = self._server_request('introspection', dict(
                    token=access_token))
            except requests.HTTPError as exc:
                if 400 <= exc.response.status_code <= 403:
                    _logger.debug("Token verification failed: %s", exc.response.text)
                    return None
                raise exc

            token = OAuthToken(id=token_id, data=tdata)
            token.exp = datetime.utcfromtimestamp(tdata['exp'])
            token.sub = str(tdata[self.options['profile.subject.attr']])
            token.persist()

            _logger.debug("Adding access token to cache (%s)", access_token)

        return token

    def access_token_to_user(self, access_token, merge_user=None):
        # TODO: Implement scope support

        token = self.query_introspection(access_token)
        if token is None:
            return None

        token.check_expiration()

        with DBSession.no_autoflush:
            user = User.filter_by(oauth_subject=token.sub).first()

            if merge_user is not None:
                if user is not None and user.id != merge_user.id:
                    raise AuthorizationException(message=_("User is already bound"))
                user = merge_user

            if user is None:
                # Register new user with default groups
                if self.options['register']:
                    user = User().persist()
                    env.auth.check_user_limit()
                    user.member_of = Group.filter_by(register=True).all()
                else:
                    return None
            elif user.disabled:
                raise UserDisabledException()

            user.oauth_subject = token.sub

            if (
                user.oauth_tstamp is not None
                and self.options['profile.sync_timedelta'] is not None
                and user.oauth_tstamp + self.options['profile.sync_timedelta'] > datetime.utcnow()
            ):
                # Skip profile synchronization
                return user
            elif merge_user is None:
                self._update_user(user, token.data)

            user.oauth_tstamp = datetime.utcnow()

        event = OnAccessTokenToUser(user, token.data)
        zope.event.notify(event)

        return user

    def _server_request(self, endpoint, params):
        url = self.options['server.{}_endpoint'.format(endpoint)]
        method = self.options.get('server.{}_method'.format(endpoint), 'POST').lower()
        params = dict(params)

        if 'client.id' in self.options:
            params['client_id'] = self.options['client.id']
        if 'client.secret' in self.options:
            params['client_secret'] = self.options['client.secret']

        _logger.debug(
            "%s request to %s endpoint: %s",
            method.upper(), endpoint.upper(),
            str(params))

        response = getattr(requests, method.lower())(
            url, params, headers=self.server_headers, timeout=self.options['timeout'])
        response.raise_for_status()

        return response.json()

    def _token_request(self, grant_type, params):
        data = self._server_request('token', dict(params, grant_type=grant_type))
        exp = datetime.utcnow() + timedelta(seconds=data['expires_in'])
        return OAuthGrantResponse(
            access_token=data['access_token'],
            refresh_token=data['refresh_token'],
            expires=exp.timestamp())

    def _update_user(self, user, token):
        opts = self.options.with_prefix('profile')

        profile_keyname = opts.get('keyname.attr', None)
        if profile_keyname is not None:
            user.keyname = token[profile_keyname]

        # Check keyname uniqueness and add numbered suffix
        keyname_base = _fallback_value(user.keyname, user.oauth_subject)
        for idx in itertools.count():
            candidate = clean_user_keyname(keyname_base, idx)
            if User.filter(
                sa.func.lower(User.keyname) == candidate.lower(),
                User.id != user.id
            ).first() is None:
                user.keyname = candidate
                break

        # Full name (display_name)
        profile_display_name = opts.get('display_name.attr', None)
        if profile_display_name is not None:
            user.display_name = ' '.join([
                token[key]
                for key in re.split(r',\s*', profile_display_name)
                if key in token])

        user.display_name = _fallback_value(user.display_name, user.keyname)

        # Group membership (member_of)
        mof_attr = opts.get('member_of.attr', None)
        if mof_attr is not None:
            mof = token[mof_attr]
            if not isinstance(mof, list):
                raise ValueError()  # FIXME!

            grp_map = dict(map(
                lambda i: i.split(':'),
                opts['member_of.map']))

            grp_keyname = list(map(
                lambda i: grp_map.get(i, i),
                mof))

            user.member_of = Group.filter(Group.keyname.in_(grp_keyname)).all()

    option_annotations = OptionAnnotations((
        Option('enabled', bool, default=False,
               doc="Enable OAuth authentication."),

        Option('default', bool, default=False,
               doc="Preffer OAuth authentication over local."),

        Option('register', bool, default=True,
               doc="Allow registering new users via OAuth."),

        Option('local_auth', bool, default=True,
               doc="Allow authentication with local password for OAuth users."),

        Option('bind', bool, default=True,
               doc="Allow binding local user to OAuth user."),

        Option('client.id', default=None,
               doc="OAuth client ID"),

        Option('client.secret', default=None, secure=True,
               doc="OAuth client secret"),

        Option('server.password', bool, default=False,
               doc="Use password grant type instead of authorization code grant type."),

        Option('server.token_endpoint',
               doc="OAuth token endpoint URL."),

        Option('server.introspection_endpoint', default=None,
               doc="OAuth token introspection endpoint URL."),

        Option('server.introspection_method', default='POST',
               doc="Workaround for NGID OAuth implementation."),

        Option('server.auth_endpoint', default=None,
               doc="OAuth authorization code endpoint URL."),

        Option('server.authorization_header', default=None,
               doc="Add Authorization HTTP header to requests to OAuth server."),

        Option('server.logout_endpoint', default=None,
               doc="OAuth logout endpoint URL."),

        Option('profile.endpoint', default=None,
               doc="OpenID Connect endpoint URL"),

        Option('profile.subject.attr', default='sub',
               doc="OAuth profile subject identifier"),

        Option('profile.keyname.attr', default='preferred_username',
               doc="OAuth profile keyname (user name)"),

        Option('profile.display_name.attr', default='name',
               doc="OAuth profile display name"),

        Option('profile.member_of.attr', default=None),
        Option('profile.member_of.map', list, default=None),

        Option('profile.sync_timedelta', timedelta, default=None,
               doc="Minimum time delta between profile synchronization with OAuth server."),

        Option('timeout', float, default=15, doc="OAuth server request timeout in seconds."),
    ))


class OnAccessTokenToUser(object):

    def __init__(self, user, profile):
        self._user = user
        self._profile = profile

    @property
    def user(self):
        return self._user

    @property
    def profile(self):
        return self._profile


OAuthGrantResponse = namedtuple('OAuthGrantResponse', [
    'access_token', 'refresh_token', 'expires'])


class OAuthToken(Base):
    __tablename__ = 'auth_oauth_token'

    id = db.Column(db.Unicode, primary_key=True)
    exp = db.Column(db.DateTime, nullable=False)
    sub = db.Column(db.Unicode, nullable=False)
    data = db.Column(db.JSONText, nullable=False)

    def check_expiration(self):
        if self.exp < datetime.utcnow():
            raise OAuthAccessTokenExpiredException()


class AuthorizationException(UserException):
    title = _("OAuth authorization error")
    http_status_code = 401


class InvalidTokenException(UserException):
    title = _("Invalid OAuth token")
    http_status_code = 401


class OAuthTokenRefreshException(UserException):
    title = _("OAuth token refresh failed")
    http_status_code = 401


class OAuthAccessTokenExpiredException(UserException):
    title = _("OAuth access token is expired")
    http_status_code = 401


def _fallback_value(*args):
    for a in args:
        if not(a is None or (
            isinstance(a, str) and a.strip() == ''
        )):
            return a
    raise ValueError("No suitable value found")
