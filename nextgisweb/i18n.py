# -*- coding: utf-8 -*-
from __future__ import unicode_literals
import sys
import os
import os.path
import fnmatch
import codecs
import logging
from importlib import import_module
from argparse import ArgumentParser
from pkg_resources import (
    iter_entry_points,
    resource_filename,
    get_distribution)
from email import message_from_string
from collections import OrderedDict
import json

from babel.messages.catalog import Catalog
from babel.messages.frontend import parse_mapping
from babel.messages.extract import extract_from_dir
from babel.messages.pofile import write_po, read_po
from babel.messages.mofile import write_mo

logger = logging.getLogger(__name__)


def load_pkginfo(args):
    for ep in iter_entry_points(group='nextgisweb.packages'):
        if ep.name == args.package:
            return ep.load()()


def get_mappings():
    fileobj = open(resource_filename('nextgisweb', 'babel.cfg'), 'r')
    return parse_mapping(fileobj)


def cmd_extract(args):
    pkginfo = load_pkginfo(args)
    for cident, cmod in pkginfo['components'].iteritems():
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


def cmd_compile(args):
    locpath = resource_filename(args.package, 'locale')
    pofiles = []
    for root, dirnames, filenames in os.walk(locpath):
        for filename in fnmatch.filter(filenames, '*.po'):
            pofiles.append(os.path.join(root, filename)[len(locpath) + 1:])

    for pofile in pofiles:
        locale = pofile.split(os.sep, 1)[0]
        domain = os.path.split(pofile)[1][:-3]

        logger.info("Compiling %s:%s", locale, domain)

        with open(os.path.join(locpath, pofile), 'r') as fd:
            catalog = read_po(fd, locale=locale, domain=domain)

        mofile = pofile[:-3] + '.mo'
        with open(os.path.join(locpath, mofile), 'w') as fd:
            write_mo(fd, catalog)

        jedfile = pofile[:-3] + '.json'
        with codecs.open(os.path.join(locpath, jedfile), 'w', 'utf-8') as fd:
            write_jed(fd, catalog)


def write_jed(fileobj, catalog):
    data = OrderedDict()
    data[''] = OrderedDict((
        ('domain', catalog.domain),
        ('lang', catalog.locale.language),
        ('plural_forms', catalog.plural_forms)))

    for msg in catalog:
        if msg.id == '':
            continue
        data[msg.id] = (msg.string, ) if isinstance(msg.string, basestring) \
            else msg.string

    fileobj.write(json.dumps(data, ensure_ascii=False, indent=2))


def main(argv=sys.argv):
    logging.basicConfig(level=logging.INFO)

    parser = ArgumentParser()
    parser.add_argument('--package', default='nextgisweb')

    subparsers = parser.add_subparsers()

    pextract = subparsers.add_parser('extract')
    pextract.set_defaults(func=cmd_extract)

    pcompile = subparsers.add_parser('compile')
    pcompile.set_defaults(func=cmd_compile)

    args = parser.parse_args(argv[1:])

    args.func(args)
