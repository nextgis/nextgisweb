# -*- coding: utf-8 -*-
import sys
import os
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
