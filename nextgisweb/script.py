import sys
import os
import logging
from argparse import ArgumentParser
from textwrap import wrap
from contextlib import contextmanager

from .lib.config import Option, NO_DEFAULT, load_config, key_to_environ
from .lib.logging import logger
from .env import Env, setenv
from .command import Command


def main(argv=sys.argv):
    argparser = ArgumentParser()

    argparser.add_argument(
        '--config', help="Configuration file.")
    argparser.add_argument(
        '--logging', help="Deprecated. Logging library configuration file.")

    config = None
    logging = None

    i = 1

    while i < len(argv):
        if argv[i] == '--config' and (i < len(argv) - 1):
            config = argv[i + 1]
        if argv[i] == '--logging' and (i < len(argv) - 1):
            logging = argv[i + 1]

        i += 2 if argv[i].startswith('--') else 1

    env = Env(cfg=load_config(config, None, hupper=True))
    setenv(env)

    if logging is not None:
        logger.warning(
            "Deprecated command line option --logging was ignored! "
            "Use environment logging.* and logger.* options instead.")

    elif 'NEXTGISWEB_LOGGING' in os.environ:
        logger.warning(
            "Deprecated environment variable NEXTGISWEB_LOGGING was ignored! "
            "Use environment logging.* and logger.* options instead.")

    subparsers = argparser.add_subparsers()

    for cmd in Command.registry:
        subparser = subparsers.add_parser(cmd.identity)
        cmd.argparser_setup(subparser, env)
        subparser.set_defaults(command=cmd)

    args = argparser.parse_args(argv[1:])

    no_initialize = hasattr(args.command, 'no_initialize') and args.command.no_initialize
    if not no_initialize:
        env.initialize()

    args.command.execute(args, env)


def config(argv=sys.argv):
    logging.basicConfig(level=logging.ERROR)
    logging.captureWarnings(True)

    argparser = ArgumentParser()

    argparser.add_argument(
        '--values-only', dest='values_only', action='store_true',
        help="Don't include settings description in comments.")

    argparser.add_argument(
        '--env-vars', dest='env_vars', action='store_true', default=False,
        help="Print settings as environment variables.")

    argparser.add_argument(
        'env_or_comp', nargs='?', type=str, default=None,
        help="Print configuration only for given component or environment.")

    args = argparser.parse_args(argv[1:])

    from .component import Component, load_all
    from .package import pkginfo
    load_all()

    headers = []
    nocomment = args.values_only
    env_or_comp = args.env_or_comp

    @contextmanager
    def _section(header):
        if header is None:
            yield
        else:
            headers.append([header, False])
            yield
            headers.pop()

    def _is_printable(line):
        return not (nocomment and (
            line == '' or line.startswith(
                ('#', ';'))))

    def _print(*lines):
        have_printable = False
        for line in lines:
            if _is_printable(line):
                have_printable = True
                break

        if have_printable:
            for i in range(len(headers)):
                itm = headers[i]
                if not itm[1]:
                    for line in itm[0]:
                        if _is_printable(line):
                            print(line)
                    itm[1] = True

            for line in lines:
                if _is_printable(line):
                    print(line)

    def _section_header(comp_or_env):
        result = []
        if comp_or_env == 'environment':
            result.append("### Environment")
        else:
            result.append("### Component '{}'".format(comp_or_env))
        if not args.env_vars:
            result.append("[{}]".format(comp_or_env))
        result.append('')
        return result

    def _section_option(oa):
        result = []
        default = oa.otype.dumps(oa.default) if oa.default != NO_DEFAULT else ""
        result.append(
            "## Option: {key} ({otype})".format(key=oa.key, otype=oa.otype)
            + (" (required)" if oa.required else "")  # NOQA: W503
            + (" (default: {})".format(default) if default != '' else "")  # NOQA: W503
        )
        if oa.doc is not None:
            result.append('\n'.join([
                ("#          " + line)
                for line in wrap(oa.doc, 70)]))
        return result

    def _print_option_value(comp_or_env, oa_or_key, value=None, required=False):
        if value is None:
            value = oa_or_key.otype.dumps(oa_or_key.default) \
                if oa_or_key.default != NO_DEFAULT else ""

        key = oa_or_key.key if isinstance(oa_or_key, Option) else oa_or_key
        if not args.env_vars:
            _print('{}{} = {}'.format(
                '; ' if not required else '',
                key.replace('*', 'key'), value))
        else:
            _print('{}{}={}'.format(
                '# ' if not required else '', key_to_environ(
                    comp_or_env + '.' + key).replace('*', 'KEY'),
                value))

    with _section(_section_header('environment')):
        for oa in Env.option_annotations:
            if env_or_comp is not None and env_or_comp != 'environment':
                break
            with _section(_section_option(oa)):
                _print_option_value('environment', oa)
                if oa.key == 'package.*':
                    packages = [
                        pi for pi in pkginfo.packages
                        if pi != 'nextgisweb']
                    tt = '# To disable packages, use these options:'
                    with _section(('', tt)):
                        for pi in packages:
                            _print_option_value(
                                'environment', 'package.{}'.format(pi),
                                value='false')

                elif oa.key == 'component.*':
                    components = [
                        ci for ci in pkginfo.components
                        if ci not in ('core', )]

                    disabled_components = [
                        ci for ci in components
                        if not pkginfo.comp_enabled(ci)]

                    tt = '# To enable optional components, use these options:'
                    with _section(('', tt)):
                        for ci in disabled_components:
                            _print_option_value(
                                'environment', 'component.{}'.format(ci),
                                value='true')

                    enabled_components = [
                        ci for ci in components
                        if pkginfo.comp_enabled(ci)]

                    tt = '# To disable components, use these options:'
                    with _section(('', tt)):
                        for ci in enabled_components:
                            _print_option_value(
                                'environment', 'component.{}'.format(ci),
                                value='false')

                _print('')

    for comp in Component.registry:
        if env_or_comp is not None and env_or_comp != comp.identity:
            continue

        with _section(_section_header(comp.identity)):
            try:
                comp_option_annotaions = comp.option_annotations
            except AttributeError:
                continue

            for oa in comp_option_annotaions:
                with _section(_section_option(oa)):
                    _print_option_value(comp.identity, oa, required=oa.required)
                    _print('')
