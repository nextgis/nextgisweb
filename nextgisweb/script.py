# -*- coding: utf-8 -*-
import sys
import os
import codecs
from argparse import ArgumentParser
from ConfigParser import ConfigParser

from pyramid.paster import setup_logging

from .env import Env
from .command import Command


def main(argv=sys.argv):
    argparser = ArgumentParser()

    argparser.add_argument('--config', default=os.environ['NEXTGISWEB_CONFIG'] if 'NEXTGISWEB_CONFIG' in os.environ else None,
                           help=u"Конфигурационный файл nextgisweb")
    argparser.add_argument('--logging', default=os.environ['NEXTGISWEB_LOGGING'] if 'NEXTGISWEB_LOGGING' in os.environ else None,
                           help=u"Конфигруционный файл библиотеки logging")

    subparsers = argparser.add_subparsers()
    for cmd in Command.registry:
        subparser = subparsers.add_parser(cmd.identity)
        cmd.argparser_setup(subparser)
        subparser.set_defaults(command=cmd)

    args = argparser.parse_args(argv[1:])

    if args.logging: 
        setup_logging(args.logging)

    cfg = ConfigParser()
    cfg.read((args.config, ))

    env = Env(cfg=cfg)
    env.initialize()

    args.command.execute(args, env)


def config(argv=sys.argv):
    argparser = ArgumentParser()
    argparser.add_argument(
        '--no-comments', dest='no_comments', action='store_true',
        help=u"Не включать описание настроек в комментарии"
    )

    args = argparser.parse_args(argv[1:])

    # немного чиним utf-8
    sys.stdout = codecs.getwriter('utf-8')(sys.stdout)

    from .component import Component, load_all
    load_all()

    for comp in Component.registry:
        if hasattr(comp, 'settings_info'):
            print u'[%s]' % comp.identity
            if not args.no_comments:
                print u''
            for s in comp.settings_info:
                if not args.no_comments and 'desc' in s:
                    print u'# %s ' % s['desc']
                if 'default' in s:
                    print '%s = %s' % (s['key'], s['default'])
                else:
                    print '# %s = ' % s['key']

            print ''
