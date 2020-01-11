# -*- coding: utf-8 -*-
from __future__ import division, absolute_import, print_function, unicode_literals
import sys
import os
from argparse import ArgumentParser
from textwrap import wrap

from pyramid.paster import setup_logging

from .lib.config import load_config, NO_DEFAULT
from .env import Env, setenv
from .command import Command


def main(argv=sys.argv):
    argparser = ArgumentParser()

    argparser.add_argument(
        '--config', help="nextgisweb configuration file")
    argparser.add_argument(
        '--logging', help="logging library configuration file")

    config = None
    logging = None

    i = 1

    while i < len(argv):
        if argv[i] == '--config' and (i < len(argv) - 1):
            config = argv[i + 1]
        if argv[i] == '--logging' and (i < len(argv) - 1):
            logging = argv[i + 1]

        i += 2 if argv[i].startswith('--') else 1

    if config is None:
        config = os.environ.get('NEXTGISWEB_CONFIG')

    if logging is None:
        logging = os.environ.get('NEXTGISWEB_LOGGING')

    if logging:
        setup_logging(logging)

    env = Env(cfg=load_config(config))
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
        '--values-only', dest='values_only', action='store_true',
        help="Don't include settings description in comments")

    args = argparser.parse_args(argv[1:])

    from .component import Component, load_all
    load_all()

    for comp in Component.registry:
        try:
            comp_option_annotaions = comp.option_annotations
        except AttributeError:
            continue

        def cprint(*lines):
            if not cprint._section:
                print("[{}]".format(comp.identity))
                if not args.values_only:
                    print()
                cprint._section = True
            print(*lines)

        cprint._section = False

        for oa in comp_option_annotaions:
            default = oa.otype.dumps(oa.default) if oa.default != NO_DEFAULT else ""

            if not args.values_only:
                cprint(
                    "# Option: {key} ({otype})".format(key=oa.key, otype=oa.otype)
                    + (" (required)" if oa.required else "")  # NOQA: W503
                    + (" (default: {})".format(default) if default != '' else "")  # NOQA: W503
                )
                if oa.doc is not None:
                    cprint('\n'.join([("#         " + l) for l in wrap(oa.doc, 60)]))

            if oa.required:
                cprint("{key} = ".format(key=oa.key))
            elif not args.values_only:
                cprint("; {key} = {default}".format(default=default, key=oa.key))

            if not args.values_only:
                cprint()
