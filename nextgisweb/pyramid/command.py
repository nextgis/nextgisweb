# -*- coding: utf-8 -*-
from __future__ import division, absolute_import, print_function, unicode_literals

import json
from datetime import datetime, timedelta
from logging import getLogger

import transaction
from six.moves.urllib.parse import urlencode, urlparse

from ..auth import User, Group
from ..command import Command
from ..compat import datetime_to_timestamp
from ..package import amd_packages

from .model import Session, SessionStore
from .util import gensecret

logger = getLogger(__name__)


@Command.registry.register
class ServerCommand(Command):
    identity = 'server'
    no_initialize = True

    @classmethod
    def argparser_setup(cls, parser, env):
        parser.add_argument('--host', type=str, default='0.0.0.0')
        parser.add_argument('--port', type=int, default='8080')
        parser.add_argument('--reload', action='store_true', default=None)
        parser.add_argument('--no-reload', dest='reload', action='store_false')

    @classmethod
    def execute(cls, args, env):
        from waitress import serve

        reload = args.reload if (args.reload is not None) else env.core.debug
        if reload:
            from hupper import start_reloader
            start_reloader(
                'nextgisweb.script.main',
                reload_interval=0.25)
            logger.info("File monitor started")

        env.initialize()

        config = env.pyramid.make_app({})
        app = config.make_wsgi_app()
        logger.debug("WSGI application created")

        serve(
            app, host=args.host, port=args.port, threads=1,
            clear_untrusted_proxy_headers=True)


@Command.registry.register
class AMDPackagesCommand():
    identity = 'amd_packages'

    @classmethod
    def argparser_setup(cls, parser, env):
        pass

    @classmethod
    def execute(cls, args, env):
        for pname, path in amd_packages():
            print(pname)


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
        user = User.filter_by(keyname=args.keyname).one_or_none()
        if user is None:
            group = Group.filter_by(keyname=args.keyname).one_or_none()
            if group is None:
                raise ValueError("User or group (keyname='%s') not found." % args.keyname)
            if len(group.members) == 0:
                raise ValueError("Group (keyname='%s') has no members." % args.keyname)
            else:
                user = group.members[0]

        result = urlparse(args.url)

        sid = gensecret(32)
        utcnow = datetime.utcnow()
        lifetime = timedelta(minutes=30)
        expires = (utcnow + lifetime).replace(microsecond=0)

        session_expires = int(datetime_to_timestamp(expires))

        options = env.auth.options.with_prefix('policy.local')
        refresh = min(lifetime / 2, options['refresh'])
        session_refresh = int(datetime_to_timestamp(utcnow + refresh))

        value = json.dumps(['LOCAL', user.id, session_expires, session_refresh])

        with transaction.manager:
            Session(id=sid, created=utcnow, last_activity=utcnow).persist()
            SessionStore(session_id=sid, key='auth.policy.current', value=value).persist()

        query = dict(sid=sid, expires=expires.isoformat(), next=result.path)

        url = result.scheme + '://' + result.netloc + '/session/invite?' + urlencode(query)

        print(url)
