# -*- coding: utf-8 -*-
from __future__ import division, unicode_literals, print_function, absolute_import
import sys
import io
import os
import os.path
import logging
import json
from importlib import import_module
from argparse import ArgumentParser, Namespace
from pkg_resources import resource_filename
from collections import OrderedDict
from functools import partial

from babel.messages.catalog import Catalog
from babel.messages.frontend import parse_mapping
from babel.messages.extract import extract_from_dir
from babel.messages.pofile import write_po, read_po
from babel.messages.mofile import write_mo
import six

from ..compat import Path
from ..package import pkginfo
from ..lib.config import load_config
from ..env import Env, setenv, env


logger = logging.getLogger(__name__)


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


def catalog_filename(component, locale, ext='po', internal=False, mkdir=False):
    if locale is None:
        locale = ''

    external_path = env.core.options['locale.external_path']
    if internal or locale == '' or locale == 'ru':
        cpath = Path(import_module(pkginfo.comp_mod(component)).__path__[0])
        base = cpath / 'locale'
    elif external_path is not None:
        epath = Path(external_path)
        ppath = epath / pkginfo.comp_pkg(component)
        if mkdir and not ppath.exists():
            ppath.mkdir(exist_ok=True)
        base = ppath / component
    else:
        raise RuntimeError("External translations path isn't set!")

    if mkdir and not base.exists():
        base.mkdir(exist_ok=True)

    return base / "{}.{}".format(locale, ext)


def components_and_locales(args, work_in_progress=False):
    ext_path = env.core.options['locale.external_path']
    ext_meta = json.loads((Path(ext_path) / 'metadata.json').read_text()) \
        if ext_path is not None else {}
    ext_packages = ext_meta.get('packages', [])
    ext_locales = ext_meta.get('locales', [])

    for comp_id in env._components.keys():
        if len(args.component) > 0 and comp_id not in args.component:
            continue
        if not args.all_packages and pkginfo.comp_pkg(comp_id) != args.package:
            continue

        if len(getattr(args, 'locale', [])) > 0:
            locales = list(args.locale)
        else:
            locales = ['ru']
            if pkginfo.comp_pkg(comp_id) in ext_packages:
                locales.extend(ext_locales)
            if work_in_progress and ext_path is not None:
                comp_path = Path(ext_path) / pkginfo.comp_pkg(comp_id) / comp_id
                for fn in comp_path.glob('*.po'):
                    candidate = fn.with_suffix('').name
                    if candidate not in locales:
                        locales.append(candidate)
        
        locales.sort()
        logger.debug("Locale list for [%s] = %s", comp_id, ' '.join(locales))
        yield comp_id, locales


def cmd_extract(args):
    for cident, _ in components_and_locales(args):
        module = import_module(pkginfo.comp_mod(cident))
        modpath = module.__path__[0]

        catalog = Catalog()
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

        outfn = catalog_filename(cident, None, ext='pot', mkdir=True)
        logger.debug("Writing POT-file to %s", outfn)

        with io.open(str(outfn), 'wb') as outfd:
            write_po(outfd, catalog, ignore_obsolete=True, omit_header=True)


def cmd_update(args):
    for comp_id, locales in components_and_locales(args, work_in_progress=True):
        pot_path = catalog_filename(comp_id, '', ext='pot', mkdir=True)

        if not pot_path.is_file() or args.extract:
            cmd_extract(Namespace(package=pkginfo.comp_pkg(comp_id), component=[comp_id, ]))

        for locale in locales:
            po_path = catalog_filename(comp_id, locale, mkdir=True)

            with io.open(str(pot_path), 'r') as pot_fd:
                pot = read_po(pot_fd, locale=locale)
                pot_is_empty = len(pot) == 0 and len(pot.obsolete) == 0

            if not po_path.is_file():
                if pot_is_empty:
                    continue

                logger.info(
                    "Creating component [%s] locale [%s]...",
                    comp_id, locale)

                with io.open(str(po_path), 'wb') as fd:
                    write_po(fd, pot, width=80, omit_header=True)

                continue

            if pot_is_empty:
                logger.info(
                    "Deleting component [%s] locale [%s]...",
                    comp_id, locale)
                po_path.unlink()
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
                    write_po(fd, po, width=80, omit_header=True)


def cmd_compile(args):
    for comp_id, locales in components_and_locales(args, work_in_progress=False):
        for locale in locales:
            catfn = partial(catalog_filename, comp_id, locale)
            po_path = catfn()
            if not po_path.exists():
                mo_path = catfn(ext='mo', internal=True)
                if mo_path.exists():
                    mo_path.unlink()
                
                jed_path = catfn(ext='jed', internal=True)
                if jed_path.exists():
                    jed_path.unlink()

                continue

            with po_path.open('r') as po:
                catalog = read_po(po, locale=locale, domain=comp_id)

            logger.info(
                "Compiling component [%s] locale [%s] (%d messages)...",
                comp_id, locale, len(catalog))

            with catfn(ext='mo', internal=True, mkdir=True).open('wb') as mo:
                write_mo(mo, catalog)

            with catfn(ext='jed', internal=True, mkdir=True).open('w') as jed:
                write_jed(jed, catalog)


def cmd_stat(args):
    stat = {}
    for comp_id, locales in components_and_locales(args, work_in_progress=True):
        stat_package = stat.setdefault(pkginfo.comp_pkg(comp_id), {})
        stat_component = stat_package[comp_id] = {}

        pot_path = catalog_filename(comp_id, None, ext='pot', mkdir=False)
        if not pot_path.is_file():
            logger.error(
                "POT-file for component [%s] not found in [%s]",
                comp_id, str(pot_path))
            continue

        with pot_path.open('r') as fd:
            pot = read_po(fd)

        stat_component = stat_package[comp_id] = dict(count=len(pot))
        stat_locales = stat_component['locales'] = dict()

        for locale in locales:
            po_path = catalog_filename(comp_id, locale, ext='po', mkdir=False)
            if po_path.exists():
                with po_path.open('r') as po_fd:
                    po = read_po(po_fd, locale=locale)
            else:
                po = Catalog(locale=locale)

            not_found, not_translated, obsolete = compare_catalogs(pot, po)

            translated = len(pot) - len(not_found) - len(not_translated)
            stat_locale = stat_locales[locale] = OrderedDict()

            stat_locale['completeness'] = round(translated / len(pot), 3) \
                if len(pot) > 0 else 1

            if not_found:
                stat_locale['not_found'] = len(not_found)
            if not_translated:
                stat_locale['not_translated'] = len(not_translated)
            if obsolete:
                stat_locale['obsolete'] = len(obsolete)

    print(json.dumps(stat, indent=2))


def main(argv=sys.argv):
    logging.basicConfig(level=logging.INFO)

    parser = ArgumentParser()
    parser.add_argument('-p', '--package', default='nextgisweb')
    parser.add_argument('--all-packages', action='store_true', default=False)
    parser.add_argument('-c', '--config')

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
    pstat.add_argument('--locale', default=[], action='append')
    pstat.set_defaults(func=cmd_stat)

    args = parser.parse_args(argv[1:])

    env = Env(cfg=load_config(args.config, None))
    setenv(env)

    args.func(args)
