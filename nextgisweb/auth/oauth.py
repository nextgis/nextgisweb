# -*- coding: utf-8 -*-
from __future__ import unicode_literals, print_function, absolute_import
import re
import six
from six.moves.urllib.parse import urlencode

import requests

from ..models import DBSession

from .models import User, Group


class OAuthServer(object):

    def __init__(self, options):
        self.register = options['register']
        self.client_id = options['client_id']
        self.client_secret = options['client_secret']

        self.auth_endpoint = options['auth_endpoint']
        self.token_endpoint = options['token_endpoint']
        self.introspection_endpoint = options['introspection_endpoint']
        self.userinfo_endpoint = options['userinfo_endpoint']

        self.userinfo_scope = options['userinfo.scope']
        self.userinfo_subject = options['userinfo.subject']
        self.userinfo_keyname = options['userinfo.keyname']
        self.userinfo_display_name = options['userinfo.display_name']

    def authorization_code_url(self, redirect_uri, **kwargs):
        qs = dict(
            client_id=self.client_id,
            response_type='code',
            redirect_uri=redirect_uri,
            **kwargs)

        if self.userinfo_scope is not None:
            qs['scope'] = self.userinfo_scope

        return self.auth_endpoint + '?' + urlencode(qs)

    def get_access_token(self, code, redirect_uri):
        response = requests.post(self.token_endpoint, dict(
            grant_type='authorization_code',
            client_id=self.client_id,
            client_secret=self.client_secret,
            redirect_uri=redirect_uri,
            code=code
        ))
        response.raise_for_status()

        data = response.json()
        return data['access_token']

    def query_userinfo(self, access_token):
        response = requests.get(self.userinfo_endpoint, headers={
            'Authorization': 'Bearer ' + access_token
        })
        response.raise_for_status()
        return response.json()

    def query_introspection(self, access_token):
        response = requests.post(self.introspection_endpoint, dict(
            client_id=self.client_id,
            client_secret=self.client_secret,
            token=access_token,
        ))
        response.raise_for_status()
        return response.json()

    def get_user(self, access_token, as_resource_server=False):
        # Use userinfo instead of introspection when introspection not available
        # TODO: This behaivor should be enabled in settings and disabled by default!
        if as_resource_server and self.introspection_endpoint is None:
            as_resource_server = False

        if as_resource_server:
            userinfo = self.query_introspection(access_token)
        else:
            userinfo = self.query_userinfo(access_token)

        with DBSession.no_autoflush:
            userinfo_subject = six.text_type(userinfo[self.userinfo_subject])
            user = User.filter_by(oauth_subject=userinfo_subject).first()

            if user is None:
                # Register new user with default groups
                if self.register:
                    user = User(oauth_subject=userinfo_subject).persist()
                    user.member_of = Group.filter_by(register=True).all()
                else:
                    return None

            if self.userinfo_display_name is not None:
                user.display_name = ' '.join([
                    six.text_type(userinfo[key])
                    for key in re.split(r',\s*', self.userinfo_display_name)
                    if key in userinfo])

            # Fallback to userinfo subject
            if user.display_name is None or re.match(r'\s+', user.display_name):
                user.display_name = userinfo_subject

            if self.userinfo_keyname is not None:
                # Check keyname uniqueness and add numbered suffix
                idx = 0
                while True:
                    candidate = userinfo[self.userinfo_keyname] \
                        + ('_{}'.format(idx) if idx > 0 else '')

                    if User.filter(
                        User.keyname == candidate,
                        User.id != user.id
                    ).first() is None:
                        user.keyname = candidate
                        break

                    idx += 1

        return user
