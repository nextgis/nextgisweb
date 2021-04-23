# -*- coding: utf-8 -*-
from __future__ import division, unicode_literals, print_function, absolute_import
import sys
import io
import os
import os.path
import fnmatch
import codecs
import logging
import json
from importlib import import_module
from argparse import ArgumentParser
from pkg_resources import (
    iter_entry_points,
    resource_filename,
    get_distribution)
from email import message_from_string
from collections import OrderedDict
from datetime import datetime

from babel import Locale
from babel.util import LOCALTZ
from babel.messages.catalog import Catalog
from babel.messages.frontend import parse_mapping
from babel.messages.extract import extract_from_dir
from babel.messages.pofile import write_po, read_po
from babel.messages.mofile import write_mo
import six

from nextgisweb.compat import Path


logger = logging.getLogger(__name__)


def load_pkginfo(args):
    for ep in iter_entry_points(group='nextgisweb.packages'):
        if ep.name == args.package:
            return ep.resolve()()


def load_components(args):
    pkginfo = load_pkginfo(args)
    for cident, cdefn in pkginfo['components'].items():
        if not args.component or cident in args.component:
            if isinstance(cdefn, six.string_types):
                yield (cident, cdefn)
            else:
                yield (cident, cdefn['module'])


def get_mappings():
    fileobj = open(resource_filename('nextgisweb', 'babel.cfg'), 'r')
    return parse_mapping(fileobj)


def write_jed(fileobj, catalog):
    data = OrderedDict()
    data[''] = OrderedDict((
        ('domain', catalog.domain),
        ('lang', catalog.locale.language),
        ('plural_forms', catalog.plural_forms)))

    for msg in catalog:
        if msg.id == '':
            continue
        data[msg.id] = (msg.string, ) if isinstance(msg.string, six.string_types) \
            else msg.string

    fileobj.write(json.dumps(data, ensure_ascii=False, indent=2))


def cmd_extract(args):
    pkginfo = load_pkginfo(args)
    for cident, cdefn in pkginfo['components'].items():
        if args.component is not None and cident not in args.component:
            continue

        if isinstance(cdefn, six.string_types):
            cmod = cdefn
        else:
            cmod = cdefn['module']
        module = import_module(cmod)
        modpath = module.__path__[0]

        dist = get_distribution(args.package)
        meta = dict(message_from_string(dist.get_metadata('PKG-INFO')))
        catalog = Catalog(
            project=args.package,
            version=dist.version,
            copyright_holder=meta.get('Author'),
            msgid_bugs_address=meta.get('Author-email'),
            fuzzy=False, charset='utf-8')

        method_map, options_map = get_mappings()

        def log_callback(filename, method, options):
            if method != 'ignore':
                filepath = os.path.normpath(os.path.join(modpath, filename))
                logger.debug('Extracting messages from %s', filepath)

        extracted = extract_from_dir(
            modpath, method_map, options_map,
            callback=log_callback)

        for filename, lineno, message, comments, context in extracted:
            catalog.add(
                message, None, [(filename, lineno)],
                auto_comments=comments, context=context)

        logger.info("%d messages extracted from component [%s]", len(catalog), cident)

        locale_path = Path(module.__path__[0]) / 'locale'
        if not locale_path.exists() and locale_path.parent.exists():
            locale_path.mkdir(exist_ok=True)

        outfn = locale_path / '.pot'
        with io.open(str(outfn), 'wb') as outfd:
            write_po(outfd, catalog, ignore_obsolete=True)


def cmd_init(args):
    for component, compmod in load_components(args):
        mod = import_module(compmod)
        locale_path = Path(mod.__path__[0]) / 'locale'
        pot_file = locale_path / '.pot'
        po_file = locale_path / ('%s.po' % args.locale)
        if not pot_file.is_file():
            logger.error(
                "POT-file for component [%s] not found in [%s]",
                component, str(pot_file))
            continue

        if po_file.is_file() and not args.force:
            logger.error(
                "Component [%s] target file exists! Skipping. "
                "Use --force to overwrite.", component)
            continue

        with io.open(str(pot_file), 'r') as infd:
            catalog = read_po(infd, locale=args.locale)

        catalog.locale = Locale.parse(args.locale)
        catalog.revision_date = datetime.now(LOCALTZ)

        with io.open(str(po_file), 'wb') as outfd:
            write_po(outfd, catalog)


def cmd_update(args):
    components = list(load_components(args))
    for comp_id, comp_mod in components:
        locale_path = Path(import_module(comp_mod).__path__[0]) / 'locale'
        if not locale_path.is_dir() or len(list(locale_path.glob('*.po'))) == 0:
            continue

        pot_path = locale_path / '.pot'
        if not pot_path.is_file():
            logger.error(
                "POT-file for component [%s] not found in [%s]",
                comp_id, str(pot_path))
            continue

        for po_path in locale_path.glob('*.po'):
            locale = po_path.with_suffix('').name
            logger.info(
                "Updating component [%s] locale [%s]...",
                comp_id, locale)

            with io.open(str(po_path), 'r') as po_fd, io.open(str(pot_path), 'r') as pot_fd:
                po = read_po(po_fd, locale=locale)
                pot = read_po(pot_fd)

            po.update(pot, True)

            with io.open(str(po_path), 'wb') as fd:
                write_po(fd, po)


def cmd_compile(args):
    components = list(load_components(args))
    for comp_id, comd_mod in components:
        locale_path = Path(import_module(comd_mod).__path__[0]) / 'locale'
        if not locale_path.is_dir() or len(list(locale_path.glob('*.po'))) == 0:
            continue

        for po_path in locale_path.glob('*.po'):
            locale = po_path.with_suffix('').name
            with io.open(str(po_path), 'r') as po:
                catalog = read_po(po, locale=locale, domain=comp_id)

            logger.info(
                "Compiling component [%s] locale [%s] (%d messages)...",
                comp_id, locale, len(catalog))

            with io.open(str(po_path.with_suffix('.mo')), 'wb') as mo:
                write_mo(mo, catalog)

            with io.open(str(po_path.with_suffix('.jed')), 'w') as jed:
                write_jed(jed, catalog)

    oldstyle_path = Path(resource_filename(args.package, 'locale'))
    for po in oldstyle_path.glob('*/LC_MESSAGES/*.po'):
        logger.error('PO-file [%s] was ignored during compilation!', str(po))


def main(argv=sys.argv):
    logging.basicConfig(level=logging.INFO)

    parser = ArgumentParser()
    parser.add_argument('-p', '--package', default='nextgisweb')

    subparsers = parser.add_subparsers()

    pextract = subparsers.add_parser('extract')
    pextract.add_argument('component', nargs='*')
    pextract.set_defaults(func=cmd_extract)

    pinit = subparsers.add_parser('init')
    pinit.add_argument('component', nargs='*')
    pinit.add_argument('locale')
    pinit.add_argument('--force', action='store_true', default=False)
    pinit.set_defaults(func=cmd_init)

    pupdate = subparsers.add_parser('update')
    pupdate.add_argument('component', nargs='*')
    pupdate.set_defaults(func=cmd_update)

    pcompile = subparsers.add_parser('compile')
    pcompile.add_argument('component', nargs='*')
    pcompile.set_defaults(func=cmd_compile)

    args = parser.parse_args(argv[1:])

    args.func(args)
