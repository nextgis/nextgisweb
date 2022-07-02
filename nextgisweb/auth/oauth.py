import re
import itertools
from datetime import datetime, timedelta
from collections import namedtuple
from functools import lru_cache
from hashlib import sha512
from urllib.parse import urlencode

import sqlalchemy as sa
from sqlalchemy.orm.exc import NoResultFound
import requests
import zope.event
from passlib.hash import sha256_crypt

from ..env import env
from ..lib.config import OptionAnnotations, Option
from ..lib.logging import logger
from .. import db
from ..models import DBSession
from ..core.exception import UserException

from .model import User, Group, Base
from .exception import UserDisabledException
from .util import _, clean_user_keyname, enum_name


MAX_TOKEN_LENGTH = 250


class OAuthHelper(object):

    def __init__(self, options):
        self.options = options

        self.authorization_code = options['server.authorization_code']
        self.password = options['server.password']
        self.local_auth = options['local_auth']

        self.server_headers = {}
        if 'server.authorization_header' in options:
            self.server_headers['Authorization'] = options['server.authorization_header']

    def authorization_code_url(self, redirect_uri, **kwargs):
        qs = dict(
            response_type='code',
            redirect_uri=redirect_uri,
            **kwargs)

        if client_id := self.options.get('client.id'):
            qs['client_id'] = client_id
        if scope := self.options.get('scope'):
            qs['scope'] = ' '.join(scope)

        return self.options['server.auth_endpoint'] + '?' + urlencode(qs)

    def grant_type_password(self, username, password):
        client_id = self.options.get('client.id')

        pwd_token_id = _password_token_hash_cache(username, password, client_id)

        try:
            pwd_token = OAuthPasswordToken.filter_by(id=pwd_token_id).one()
        except NoResultFound:
            # If no token found, create new one not adding it into DBSession.
            # otherwise an error could happen when an incomplete token record is
            # flushed to DB.
            pwd_token = OAuthPasswordToken(id=pwd_token_id)
        else:
            now = datetime.utcnow()
            if pwd_token.exp > now:
                return pwd_token.to_grant_response()

            if pwd_token.refresh_exp > now:
                try:
                    tresp = self.grant_type_refresh_token(
                        pwd_token.refresh_token, pwd_token.access_token)
                except OAuthTokenRefreshException:
                    pass
                else:
                    pwd_token.update_from_grant_response(tresp)
                    return tresp

        params = dict(username=username, password=password)
        if scope := self.options.get('scope'):
            params['scope'] = ' '.join(scope)

        try:
            tresp = self._token_request('password', params)
        except requests.HTTPError as exc:
            if 400 <= exc.response.status_code <= 403:
                logger.debug("Password grant type failed: %s", exc.response.text)
                raise OAuthPasswordGrantTypeException()
            raise

        pwd_token.update_from_grant_response(tresp)
        DBSession.merge(pwd_token)
        return tresp

    def grant_type_authorization_code(self, code, redirect_uri):
        return self._token_request('authorization_code', dict(
            redirect_uri=redirect_uri, code=code))

    def grant_type_refresh_token(self, refresh_token, access_token):
        try:
            return self._token_request('refresh_token', dict(
                refresh_token=refresh_token,
                access_token=access_token))
        except requests.HTTPError as exc:
            if 400 <= exc.response.status_code <= 403:
                logger.debug("Token refresh failed: %s", exc.response.text)
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
            logger.debug("Access token was read from cache (%s)", access_token)
        else:
            try:
                tdata = self._server_request('introspection', dict(
                    token=access_token))
            except requests.HTTPError as exc:
                if 400 <= exc.response.status_code <= 403:
                    logger.debug("Token verification failed: %s", exc.response.text)
                    return None
                raise exc

            if self.options.get('scope') is not None:
                token_scope = set(tdata['scope'].split(' ')) if 'scope' in tdata else set()
                if (not set(self.options['scope']).issubset(token_scope)):
                    raise InvalidScopeException()

            token = OAuthToken(id=token_id, data=tdata)
            token.exp = datetime.utcfromtimestamp(tdata['exp'])
            token.sub = str(tdata[self.options['profile.subject.attr']])
            token.persist()

            logger.debug("Adding access token to cache (%s)", access_token)

        return token

    def access_token_to_user(self, access_token, bind_user=None):
        token = self.query_introspection(access_token)
        if token is None:
            return None

        token.check_expiration()

        with DBSession.no_autoflush:
            user = User.filter_by(oauth_subject=token.sub).first()

            if bind_user is not None:
                if user is not None and user.id != bind_user.id:
                    dn = self.options['server.display_name']
                    raise AuthorizationException(
                        title=_("{} binding error").format(dn),
                        message=_(
                            "This {dn} account ({sub}) is already bound to "
                            "the different user ({id}). Log in using this "
                            "account instead of binding it."
                        ).format(dn=dn, sub=token.sub, id=user.id))
                user = bind_user

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
            elif bind_user is None:
                self._update_user(user, token.data)

            user.oauth_tstamp = datetime.utcnow()

        DBSession.flush()  # Force user.id sequence value

        event = OnAccessTokenToUser(user, token.data)
        zope.event.notify(event)

        return user

    def _server_request(self, endpoint, params):
        url = self.options['server.{}_endpoint'.format(endpoint)]
        method = self.options.get('server.{}_method'.format(endpoint), 'POST').lower()
        params = dict(params)

        if client_id := self.options.get('client.id'):
            params['client_id'] = client_id
        if client_secret := self.options.get('client.secret'):
            params['client_secret'] = client_secret

        logger.debug(
            "%s request to %s endpoint: %s",
            method.upper(), endpoint.upper(),
            str(params))

        timeout = self.options['timeout'].total_seconds()
        response = getattr(requests, method.lower())(
            url, params, headers=self.server_headers, timeout=timeout)
        response.raise_for_status()

        return response.json()

    def _token_request(self, grant_type, params):
        data = self._server_request('token', dict(params, grant_type=grant_type))
        exp = datetime.utcnow() + timedelta(seconds=data['expires_in'])
        refresh_exp = datetime.utcnow() + (
            timedelta(seconds=data['refresh_expires_in']) if 'refresh_expires_in' in data
            else self.options['server.refresh_expires_in'])
        return OAuthGrantResponse(
            access_token=data['access_token'],
            refresh_token=data['refresh_token'],
            expires=exp.timestamp(),
            refresh_expires=refresh_exp.timestamp())

    def _update_user(self, user, token):
        opts = self.options.with_prefix('profile')

        if user.keyname is None or not opts['keyname.no_update']:
            profile_keyname = opts.get('keyname.attr', None)
            if profile_keyname is not None:
                user.keyname = token[profile_keyname]

            # Check keyname/display_name uniqueness and add numbered suffix
            keyname_base = _fallback_value(user.keyname, user.oauth_subject)
            for idx in itertools.count():
                candidate = clean_user_keyname(keyname_base)
                candidate = enum_name(candidate, idx, sep="_")
                if User.filter(
                    sa.func.lower(User.keyname) == candidate.lower(),
                    User.id != user.id
                ).first() is None:
                    user.keyname = candidate
                    break

        if user.display_name is None or not opts['display_name.no_update']:
            profile_display_name = opts.get('display_name.attr', None)
            if profile_display_name is not None:
                user.display_name = ' '.join([
                    token[key]
                    for key in re.split(r',\s*', profile_display_name)
                    if key in token])

            display_name_base = _fallback_value(user.display_name, user.keyname)
            for idx in itertools.count():
                candidate = enum_name(display_name_base, idx, sep=" ")
                if User.filter(
                    sa.func.lower(User.display_name) == candidate.lower(),
                    User.id != user.id
                ).first() is None:
                    user.display_name = candidate
                    break

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

        Option('default', bool, default=False, doc=(
            "Use OAuth authentication by default. Unauthenticated user viewing "
            "forbidden page will be redirected to OAuth server without showing "
            "login dialog. Login dialog will be available at /login URL.")),

        Option('register', bool, default=True,
               doc="Allow registering new users via OAuth."),

        Option('local_auth', bool, default=True,
               doc="Allow authentication with local password for OAuth users."),

        Option('bind', bool, default=True,
               doc="Allow binding local user to OAuth user."),

        Option('scope', list, default=None,
               doc="OAuth scopes"),

        Option('client.id', default=None,
               doc="OAuth client ID"),

        Option('client.secret', default=None, secure=True,
               doc="OAuth client secret"),

        Option('server.display_name', default='OAuth'),

        Option('server.authorization_code', bool, default=True,
               doc="Use authorization code grant type."),

        Option('server.password', bool, default=False,
               doc="Use password grant type."),

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

        Option('server.refresh_expires_in', timedelta, default=timedelta(days=7),
               doc="Default refresh token expiration (if not set by OAuth server)."),

        Option('server.logout_endpoint', default=None,
               doc="OAuth logout endpoint URL."),

        Option('profile.endpoint', default=None,
               doc="OpenID Connect endpoint URL"),

        Option('profile.subject.attr', default='sub',
               doc="OAuth profile subject identifier"),

        Option('profile.keyname.attr', default='preferred_username',
               doc="OAuth profile keyname (user name)"),
        Option('profile.keyname.no_update', bool, default=False,
               doc="Turn off keyname secondary synchronization"),

        Option('profile.display_name.attr', default='name',
               doc="OAuth profile display name"),
        Option('profile.display_name.no_update', bool, default=False,
               doc="Turn off display_name secondary synchronization"),

        Option('profile.member_of.attr', default=None),
        Option('profile.member_of.map', list, default=None),

        Option('profile.sync_timedelta', timedelta, default=None,
               doc="Minimum time delta between profile synchronization with OAuth server."),

        Option('timeout', timedelta, default=timedelta(seconds=15), doc="OAuth server request timeout."),
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
    'access_token', 'refresh_token', 'expires', 'refresh_expires'])


class OAuthPasswordToken(Base):
    __tablename__ = 'auth_oauth_password_token'

    id = db.Column(db.Unicode, primary_key=True)
    access_token = db.Column(db.Unicode, nullable=False)
    exp = db.Column(db.DateTime, nullable=False)
    refresh_token = db.Column(db.Unicode, nullable=False)
    refresh_exp = db.Column(db.DateTime, nullable=False)

    def update_from_grant_response(self, tresp):
        self.access_token = tresp.access_token
        self.refresh_token = tresp.refresh_token
        self.exp = datetime.utcfromtimestamp(tresp.expires)
        self.refresh_exp = datetime.utcfromtimestamp(tresp.refresh_expires)

    def to_grant_response(self):
        return OAuthGrantResponse(
            access_token=self.access_token,
            refresh_token=self.refresh_token,
            expires=self.exp.timestamp(),
            refresh_expires=self.refresh_exp.timestamp())


@lru_cache(maxsize=256)
def _password_token_hash_cache(username, password, salt):
    return sha256_crypt.hash(f"{username}:{password}:{salt if salt else 'ngw'}")


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


class InvalidScopeException(UserException):
    title = _("Invalid OAuth scope")
    http_status_code = 401


class OAuthPasswordGrantTypeException(UserException):
    title = _("OAuth password grant type failed")
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
