# -*- coding: utf-8 -*-
from __future__ import unicode_literals, absolute_import

import sys
import os
import codecs
from argparse import ArgumentParser
from ConfigParser import ConfigParser

from pyramid.paster import setup_logging

from .env import Env, setenv
from .command import Command


def main(argv=sys.argv):
    argparser = ArgumentParser()

    argparser.add_argument(
        '--config', default=os.environ.get('NEXTGISWEB_CONFIG'),
        help="Конфигурационный файл nextgisweb")

    argparser.add_argument(
        '--logging', default=os.environ.get('NEXTGISWEB_LOGGING'),
        help="Конфигруционный файл библиотеки logging")

    config = None
    logging = None

    i = 1

    while i < len(argv):
        if argv[i] == '--config' and (i < len(argv) - 1):
            config = argv[i + 1]
        if argv[i] == '--logging' and (i < len(argv) - 1):
            logging = argv[i + 1]

        i += 2 if argv[i].startswith('--') else 1

    if logging:
        setup_logging(logging)

    cfg = ConfigParser()

    if config:
        cfg.readfp(codecs.open(config, 'r', 'utf-8'))

    env = Env(cfg=cfg)
    env.initialize()

    setenv(env)

    subparsers = argparser.add_subparsers()

    for cmd in Command.registry:
        subparser = subparsers.add_parser(cmd.identity)
        cmd.argparser_setup(subparser, env)
        subparser.set_defaults(command=cmd)

    args = argparser.parse_args(argv[1:])

    if args.logging:
        setup_logging(args.logging)

    args.command.execute(args, env)


def config(argv=sys.argv):
    argparser = ArgumentParser()

    argparser.add_argument(
        '--no-comments', dest='no_comments', action='store_true',
        help="Не включать описание настроек в комментарии")

    argparser.add_argument(
        '--preseed', metavar='file.ini', default=None,
        help="Файл с предопределенными настройками")

    args = argparser.parse_args(argv[1:])

    # немного чиним utf-8
    sys.stdout = codecs.getwriter('utf-8')(sys.stdout)

    from .component import Component, load_all
    load_all()

    preseedcfg = ConfigParser()

    if args.preseed:
        with codecs.open(args.preseed, 'r', 'utf-8') as fd:
            preseedcfg.readfp(fd)

    for comp in Component.registry:
        if hasattr(comp, 'settings_info'):
            print u'[%s]' % comp.identity

            if not args.no_comments:
                print u''

            preseedsect = dict(
                preseedcfg.items(comp.identity)
                if preseedcfg.has_section(comp.identity)
                else ())

            preseedkeys = set()

            for s in comp.settings_info:
                if not args.no_comments and 'desc' in s:
                    print u'# %s ' % s['desc']

                if s['key'] in preseedsect:
                    print '%s = %s' % (s['key'], preseedsect[s['key']])
                    preseedkeys.add(s['key'])

                elif 'default' in s:
                    print '%s = %s' % (s['key'], s['default'])

                elif not args.no_comments:
                    print '# %s = ' % s['key']

            for k, v in preseedsect.iteritems():
                if k not in preseedkeys:
                    print '%s = %s' % (k, v)

            print ''
