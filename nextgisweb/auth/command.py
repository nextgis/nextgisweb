# -*- coding: utf-8 -*-
from __future__ import division, absolute_import, print_function, unicode_literals

import json
import logging
from datetime import datetime, timedelta

import transaction
from six.moves.urllib.parse import urlencode, urlparse

from ..command import Command
from ..compat import datetime_to_timestamp
from ..pyramid import Session, SessionStore
from ..pyramid.util import gensecret

from . import User, Group


logger = logging.getLogger(__name__)


@Command.registry.register
class ChangePasswordCommand():
    identity = 'change_password'

    @classmethod
    def argparser_setup(cls, parser, env):
        parser.add_argument(
            'keyname', type=str, metavar='user',
            help="The user whose password needs to be changed")

        parser.add_argument(
            'password', type=str, metavar='password',
            help="User's new password")

        # FIXME: Set new user password via command line
        # is potentially not secure, need to read from console or file.

    @classmethod
    def execute(cls, args, env):
        with transaction.manager:
            user = User.filter_by(keyname=args.keyname).one()
            user.password = args.password


@Command.registry.register
class AuthenticateCommand():
    identity = 'authenticate'

    @classmethod
    def argparser_setup(cls, parser, env):
        parser.add_argument(
            'keyname', type=str, metavar='user|group',
            help="User or group whose user will be authenticated")
        parser.add_argument(
            'url', type=str, metavar='url',
            help="Web GIS page")

    @classmethod
    def execute(cls, args, env):

        def critical_error(msg):
            logger.critical(msg)
            exit(1)

        user = User.filter_by(keyname=args.keyname).one_or_none()
        if user is None:
            group = Group.filter_by(keyname=args.keyname).one_or_none()
            if group is None:
                critical_error("User or group (keyname='%s') not found." % args.keyname)
            if len(group.members) == 0:
                critical_error("Group (keyname='%s') has no members." % args.keyname)
            else:
                user = group.members[0]

        if user.disabled:
            critical_error("User (keyname='%s') is disabled." % args.keyname)

        result = urlparse(args.url)

        sid = gensecret(32)
        utcnow = datetime.utcnow()
        lifetime = timedelta(minutes=30)
        expires = (utcnow + lifetime).replace(microsecond=0)

        session_expires = int(datetime_to_timestamp(expires))

        options = env.auth.options.with_prefix('policy.local')
        refresh = min(lifetime / 2, options['refresh'])
        session_refresh = int(datetime_to_timestamp(utcnow + refresh))

        current = ['LOCAL', user.id, session_expires, session_refresh]

        with transaction.manager:
            Session(id=sid, created=utcnow, last_activity=utcnow).persist()
            for k, v in (
                ('auth.policy.current', current),
                ('invite', True),
            ):
                SessionStore(session_id=sid, key=k, value=json.dumps(v)).persist()

        query = dict(sid=sid, expires=expires.isoformat(), next=result.path)

        url = result.scheme + '://' + result.netloc + '/session/invite?' + urlencode(query)

        print(url)
