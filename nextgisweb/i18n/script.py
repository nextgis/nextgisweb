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
from argparse import ArgumentParser, Namespace
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
from nextgisweb.package import pkginfo


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


def compare_catalogs(fileA, fileB):
    not_found = []
    not_translated = []
    obsolete = []

    for msgA in fileA:
        if msgA.id == '':
            continue
        msgB = fileB.get(msgA.id)
        if not msgB:
            not_found.append(msgA.id)
            continue
        if not msgB.string:
            not_translated.append(msgA.id)

    for msgB in fileB:
        if msgB.id == '':
            continue
        msgA = fileA.get(msgB.id)
        if msgA is None:
            obsolete.append(msgB.id)

    return not_found, not_translated, obsolete


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
        if len(args.component) > 0 and cident not in args.component:
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


def cmd_update(args):
    components = list(load_components(args))
    for comp_id, comp_mod in components:
        locale_path = Path(import_module(comp_mod).__path__[0]) / 'locale'
        if not locale_path.is_dir():
            continue

        pot_path = locale_path / '.pot'
        if not pot_path.is_file() or args.extract:
            cmd_extract(Namespace(package=args.package, component=[comp_id, ]))

        po_paths = [locale_path / ('%s.po' % locale) for locale in args.locale]
        po_paths = po_paths or locale_path.glob('*.po')

        for po_path in po_paths:
            locale = po_path.with_suffix('').name

            with io.open(str(pot_path), 'r') as pot_fd:
                pot = read_po(pot_fd, locale=locale)

            if not po_path.is_file():
                pot.locale = Locale.parse(locale)
                pot.revision_date = datetime.now(LOCALTZ)

                logger.info(
                    "Creating component [%s] locale [%s]...",
                    comp_id, locale)

                with io.open(str(po_path), 'wb') as fd:
                    write_po(fd, pot, width=80)

                continue

            with io.open(str(po_path), 'r') as po_fd:
                po = read_po(po_fd, locale=locale)

            not_found, _, obsolete = compare_catalogs(pot, po)

            if not_found or obsolete or args.force:
                logger.info(
                    "Updating component [%s] locale [%s]...",
                    comp_id, locale)

                po.update(pot, True)

                # Remove obsolete untranslated strings but keep translated ones.
                # They might be useful during small changes in message ids.
                for msg_id in [
                    msg.id for msg in po.obsolete.values()
                    if msg.string == ''
                ]:
                    del po.obsolete[msg_id]

                with io.open(str(po_path), 'wb') as fd:
                    write_po(fd, po, width=80)


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


def cmd_stat(args):
    if args.all_packages:
        raise RuntimeError("Option --all-packages is not supported for this command.")

    stat = {}
    stat_package = {}
    stat[args.package] = stat_package

    components = list(load_components(args))
    for comp_id, comp_mod in components:
        stat_component = {}
        stat_package[comp_id] = stat_component

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

            with io.open(str(po_path), 'r') as po_fd, io.open(str(pot_path), 'r') as pot_fd:
                po = read_po(po_fd, locale=locale)
                pot = read_po(pot_fd)

                terms_translated = [term for term in po if term.string and term.id != '']
                terms_not_found, _, obsolete = compare_catalogs(pot, po)

                stat_locale = {
                    'terms': len(po),
                    'translated': len(terms_translated),
                }

                if len(terms_not_found) != 0:
                    stat_locale['not_found'] = len(terms_not_found)
                
                if len(obsolete) > 0:
                    stat_locale['obsolete'] = len(obsolete)

                stat_component[locale] = stat_locale

    print(json.dumps(stat, indent=2))


def main(argv=sys.argv):
    logging.basicConfig(level=logging.INFO)

    parser = ArgumentParser()
    parser.add_argument('-p', '--package', default='nextgisweb')
    parser.add_argument('--all-packages', action='store_true', default=False)

    subparsers = parser.add_subparsers()

    pextract = subparsers.add_parser('extract')
    pextract.add_argument('component', nargs='*')
    pextract.set_defaults(func=cmd_extract)

    pupdate = subparsers.add_parser('update')
    pupdate.add_argument('component', nargs='*')
    pupdate.add_argument('--locale', default=[], action='append')
    pupdate.add_argument('--force', action='store_true', default=False)
    pupdate.add_argument('--extract', action='store_true', default=False)
    pupdate.set_defaults(func=cmd_update)

    pcompile = subparsers.add_parser('compile')
    pcompile.add_argument('component', nargs='*')
    pcompile.set_defaults(func=cmd_compile)

    pstat = subparsers.add_parser('stat')
    pstat.add_argument('component', nargs='*')
    pstat.set_defaults(func=cmd_stat)

    args = parser.parse_args(argv[1:])

    if args.all_packages:
        for package in pkginfo.packages:
            args.package = package
            args.func(args)
    else:
        args.func(args)
