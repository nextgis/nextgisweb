# -*- coding: utf-8 -*-
from __future__ import division, absolute_import, print_function, unicode_literals
from logging import getLogger
from datetime import datetime
from base64 import b64decode

from ..compat import timestamp_to_datetime, datetime_to_timestamp


logger = getLogger(__name__)


class AuthenticationPolicy(object):

    def __init__(self, comp, options):
        self.comp = comp
        self.oauth = comp.oauth
        self.options = options

    def unauthenticated_userid(self, request):
        return None

    def authenticated_userid(self, request):
        session = request.session

        # Session based authentication

        current = session.get('auth.policy.current')
        if current is not None:
            atype, user_id, exp = current[0:3]
            exp = timestamp_to_datetime(int(exp))

            now = datetime.utcnow()
            expired = exp <= now

            if atype == 'OAUTH':
                if len(current) != 3:
                    raise ValueError("Invalid OAuth session data")

                if expired:
                    tresp = self.oauth.grant_type_refresh_token(
                        refresh_token=session['auth.policy.refresh_token'],
                        access_token=session['auth.policy.access_token'])
                    self.remember((user_id, tresp))

                return user_id

            elif atype == 'LOCAL':
                if expired:
                    return None

                refresh, = current[3:]
                if timestamp_to_datetime(refresh) <= now:
                    session['auth.policy.current'] = current[0:2] + (
                        int(datetime_to_timestamp(now + self.options['local.lifetime'])),
                        int(datetime_to_timestamp(now + self.options['local.refresh'])),
                    )

                return user_id

        # HTTP based authentication

        ahead = request.headers.get('Authorization')
        if ahead is not None:
            ahead = ahead.decode('utf-8')
            amode, value = ahead.split(' ')
            amode = amode.upper()

            if amode == 'BASIC':
                username, password = b64decode(value).split(':')

                # Allow token authorization via basic when
                # username is empty (for legacy clients).

                if username == '':
                    amode = 'BEARER'
                    value = password

                else:
                    user, _ = self.comp.authenticate_with_password(
                        username, password, oauth=False)
                    return user.id

            if amode == 'BEARER':
                user = self.oauth.access_token_to_user(value)
                return user.id

        return None

    def effective_principals(self, request):
        return []

    def remember(self, request, what):
        session = request.session
        user_id, tresp = what

        atype = 'LOCAL' if tresp is None else 'OAUTH'
        exp = int(datetime_to_timestamp(datetime.utcnow() + self.options['local.lifetime'])) \
            if tresp is None else tresp.expires

        session['auth.policy.current'] = (atype, user_id, int(exp)) + ((
            int(datetime_to_timestamp(datetime.utcnow() + self.options['local.refresh'])),
        ) if atype == 'LOCAL' else ())

        for k in ('access_token', 'refresh_token'):
            sk = 'auth.policy.{}'.format(k)
            if tresp is None:
                if sk in session:
                    del session[sk]
            else:
                session[sk] = getattr(tresp, k)

        return ()

    def forget(self, request):
        session = request.session

        for k in ('current', 'access_token', 'refresh_token'):
            sk = 'auth.policy.{}'.format(k)
            if sk in session:
                del session[sk]

        return ()
