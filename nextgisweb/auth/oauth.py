# -*- coding: utf-8 -*-
from __future__ import unicode_literals, print_function, absolute_import
import re
import itertools
from datetime import datetime, timedelta
from collections import namedtuple
import six
from six.moves.urllib.parse import urlencode

import requests
import zope.event

from ..lib.config import OptionAnnotations, Option
from ..compat import datetime_to_timestamp
from .. import db
from ..models import DBSession
from ..core.exception import UserException

from .models import User, Group, Base
from .util import _, clean_user_keyname


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
        return self._token_request('refresh_token', dict(
            refresh_token=refresh_token,
            access_token=access_token))

    def query_profile(self, access_token):
        headers = dict(self.server_headers)
        headers['Authorization'] = 'Bearer ' + access_token
        response = requests.get(self.options['profile.endpoint'], headers=headers)
        response.raise_for_status()
        return response.json()

    def query_introspection(self, access_token):
        with DBSession.no_autoflush:
            token = OAuthToken.filter_by(id=access_token).first()

        if token is None:
            tdata = self._server_request('introspection', dict(
                token=access_token))
            token = OAuthToken(id=access_token, data=tdata)
            token.exp = datetime.utcfromtimestamp(tdata['exp'])
            token.sub = six.text_type(tdata[self.options['profile.subject']])
            token.persist()

        return token

    def access_token_to_user(self, access_token, as_resource_server=False):
        # Use profile (userinfo) endpoint when enabled, othewise use token introspection
        if self.options['profile.endpoint'] is not None:
            profile = self.query_profile(access_token)
        else:
            # TODO: Implement scope support
            token = self.query_introspection(access_token)
            profile = token.data

        token.check_expiration()

        with DBSession.no_autoflush:
            profile_subject = six.text_type(profile[self.options['profile.subject']])
            user = User.filter_by(oauth_subject=profile_subject).first()

            if user is None:
                # Register new user with default groups
                if self.options['register']:
                    user = User(oauth_subject=profile_subject).persist()
                    user.member_of = Group.filter_by(register=True).all()
                else:
                    return None

            if (
                user.oauth_tstamp is not None and
                self.options['profile.sync_timedelta'] is not None and
                user.oauth_tstamp + self.options['profile.sync_timedelta'] > datetime.utcnow()
            ):
                # Skip profile synchronization
                return user
            else:
                user.oauth_tstamp = datetime.utcnow()

            profile_display_name = self.options.get('profile.display_name', None)
            if profile_display_name is not None:
                user.display_name = ' '.join([
                    six.text_type(profile[key])
                    for key in re.split(r',\s*', profile_display_name)
                    if key in profile])

            # Fallback to profile subject
            if user.display_name is None or re.match(r'\s+', user.display_name):
                user.display_name = profile_subject

            profile_keyname = self.options.get('profile.keyname', None)
            if profile_keyname is not None:
                base = profile[profile_keyname]

                # Check keyname uniqueness and add numbered suffix
                for idx in itertools.count():
                    candidate = clean_user_keyname(base, idx)
                    if User.filter(
                        User.keyname == candidate,
                        User.id != user.id
                    ).first() is None:
                        user.keyname = candidate
                        break

        event = OnAccessTokenToUser(user, profile)
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

        response = getattr(requests, method.lower())(url, params, headers=self.server_headers)
        response.raise_for_status()

        return response.json()

    def _token_request(self, grant_type, params):
        data = self._server_request('token', dict(params, grant_type=grant_type))
        exp = datetime.utcnow() + timedelta(seconds=data['expires_in'])
        return OAuthGrantResponse(
            access_token=data['access_token'],
            refresh_token=data['refresh_token'],
            expires=datetime_to_timestamp(exp))

    option_annotations = OptionAnnotations((
        Option('enabled', bool, default=False,
               doc="Enable OAuth authentication."),

        Option('register', bool, default=False,
               doc="Allow registering new users via OAuth."),

        Option('local_auth', bool, default=True,
               doc="Allow authentication with local password for OAuth users."),

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

        Option('profile.endpoint', default=None,
               doc="OpenID Connect endpoint URL"),

        Option('profile.subject', default='sub',
               doc="OAuth profile subject identifier"),

        Option('profile.keyname', default='preferred_username',
               doc="OAuth profile keyname (user name)"),

        Option('profile.display_name', default='name',
               doc="OAuth profile display name"),

        Option('profile.sync_timedelta', timedelta, default=None,
               doc="Minimum time delta between profile synchronization with OAuth server."),
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


class OAuthAccessTokenExpiredException(UserException):
    title = _("OAuth access token is expired")
    http_status_code = 403
