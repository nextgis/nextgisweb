# -*- coding: utf-8 -*-
from __future__ import unicode_literals, print_function, absolute_import
import sys
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

logger = logging.getLogger(__name__)


def load_pkginfo(args):
    for ep in iter_entry_points(group='nextgisweb.packages'):
        if ep.name == args.package:
            return ep.load()()


def load_components(args):
    pkginfo = load_pkginfo(args)
    for cident, cmod in pkginfo['components'].items():
        if not args.component or cident in args.component:
            yield (cident, cmod)


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
    for cident, cmod in pkginfo['components'].items():
        if args.component is not None and cident not in args.component:
            continue

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

        if len(catalog) > 0:
            logger.info("Component %s: %d messages", cident, len(catalog))
            outfn = resource_filename(args.package, 'locale/%s.pot' % cident)
            with open(outfn, 'w') as outfd:
                write_po(outfd, catalog, ignore_obsolete=True)


def cmd_init(args):
    root = resource_filename(args.package, 'locale')

    for component, compmod in load_components(args):
        potfile = os.path.join(root, '%s.pot' % component)
        if not os.path.isfile(potfile):
            logger.warning("Component '%s' template file not found! Skipping.", component) # NOQA
            continue

        with open(potfile, 'r') as infd:
            catalog = read_po(infd, locale=args.locale)

        catalog.locale = Locale.parse(args.locale)
        catalog.revision_date = datetime.now(LOCALTZ)

        pofile = os.path.join(
            root, args.locale, 'LC_MESSAGES',
            '%s.po' % component)

        if os.path.isfile(pofile) and not args.force:
            logger.warning("Component '%s' target file exists! Skipping. Use --force to overwrite.", component) # NOQA
            continue

        with open(pofile, 'w') as outfd:
            write_po(outfd, catalog)


def cmd_update(args):
    root = resource_filename(args.package, 'locale')
    pofiles = []
    for dirname, dirnames, filenames in os.walk(root):
        for filename in fnmatch.filter(filenames, '*.po'):
            relative = os.path.relpath(os.path.join(dirname, filename), root)
            pofiles.append(relative)

    components = [cid for cid, _ in load_components(args)]

    for pofile in pofiles:
        locale = pofile.split(os.sep)[0]
        component = os.path.split(pofile)[1].split('.', 1)[0]

        if component not in components:
            continue

        logger.info("Updating component '%s' locale '%s'...", component, locale) # NOQA

        with open(os.path.join(root, pofile), 'r') as fd:
            catalog = read_po(fd, locale=locale, charset='utf-8')

        potfile = os.path.join(root, '%s.pot' % component)
        if not os.path.isfile(potfile):
            logger.warn("Template for %s:%s doesn't exists! Skipping.", locale, component) # NOQA

        with codecs.open(potfile, 'r', 'utf-8') as fd:
            template = read_po(fd)

        catalog.update(template, True)

        with open(os.path.join(root, pofile), 'w') as fd:
            write_po(fd, catalog)


def cmd_compile(args):
    locpath = resource_filename(args.package, 'locale')
    pofiles = []
    for root, dirnames, filenames in os.walk(locpath):
        for filename in fnmatch.filter(filenames, '*.po'):
            pofiles.append(os.path.join(root, filename)[len(locpath) + 1:])

    components = [cid for cid, _ in load_components(args)]

    for pofile in pofiles:
        locale = pofile.split(os.sep, 1)[0]
        component = os.path.split(pofile)[1][:-3]

        if component not in components:
            continue

        logger.info("Compiling component '%s' locale '%s'...", component, locale) # NOQA

        with open(os.path.join(locpath, pofile), 'r') as fd:
            catalog = read_po(fd, locale=locale, domain=component)

        mofile = pofile[:-3] + '.mo'
        with open(os.path.join(locpath, mofile), 'w') as fd:
            write_mo(fd, catalog)

        jedfile = pofile[:-3] + '.jed'
        with codecs.open(os.path.join(locpath, jedfile), 'w', 'utf-8') as fd:
            write_jed(fd, catalog)


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
