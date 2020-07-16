# -*- coding: utf-8 -*-
from __future__ import division, absolute_import, print_function, unicode_literals
from logging import getLogger

from ..command import Command

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

        serve(app, host=args.host, port=args.port, threads=1)
