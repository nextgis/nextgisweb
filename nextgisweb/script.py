# -*- coding: utf-8 -*-
import sys
import os
from argparse import ArgumentParser

from sqlalchemy import engine_from_config

from pyramid.paster import get_appsettings, setup_logging


from .component import load_all
from .command import Command
from .models import DBSession, Base


def main(argv=sys.argv):
    load_all()

    argparser = ArgumentParser()

    argparser.add_argument('--config', default=os.environ['NEXTGISWEB_CONFIG'] if 'NEXTGISWEB_CONFIG' in os.environ else None,
                           help=u"Конфигурационный файл")

    subparsers = argparser.add_subparsers()
    for cmd in Command.registry:
        subparser = subparsers.add_parser(cmd.identity)
        subparser.set_defaults(command=cmd)

    args = argparser.parse_args(argv[1:])
    config_uri = args.config
    setup_logging(config_uri)
    settings = get_appsettings(config_uri)

    settings['sqlalchemy.url'] = 'postgresql+psycopg2://%(user)s%(password)s@%(host)s/%(name)s' % dict(
        user=settings['database.user'],
        password=(':' + settings['database.password']) if 'database.password' in settings else '',
        host=settings['database.host'],
        name=settings['database.name'],
    )

    engine = engine_from_config(settings, 'sqlalchemy.')
    DBSession.configure(bind=engine)

    args.command.execute(args)
