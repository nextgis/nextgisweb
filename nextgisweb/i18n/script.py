import sys
import io
import os
import os.path
import logging
import json
import re
from importlib import import_module
from packaging import version as pkg_version
from pathlib import Path
from argparse import ArgumentParser, Namespace
from pkg_resources import resource_filename
from collections import OrderedDict, defaultdict
from functools import partial
from tempfile import NamedTemporaryFile
from time import sleep

from babel.messages.catalog import Catalog
from babel.messages.frontend import parse_mapping
from babel.messages.extract import extract_from_dir
from babel.messages.pofile import write_po, read_po
from babel.messages.mofile import write_mo
from attr import attrs, attrib, asdict
from poeditor import POEditorAPI

from ..lib.config import load_config
from ..lib.logging import logger
from ..package import pkginfo
from ..env import Env, setenv, env


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
        data[msg.id] = (msg.string, ) if isinstance(msg.string, str) \
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
        if (
            not getattr(args, 'all_packages', False)
            and pkginfo.comp_pkg(comp_id) != args.package
        ):
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

        with io.open(outfn, 'wb') as outfd:
            write_po(outfd, catalog, ignore_obsolete=True, omit_header=True)


def cmd_update(args):
    for comp_id, locales in components_and_locales(args, work_in_progress=True):
        pot_path = catalog_filename(comp_id, '', ext='pot', mkdir=True)

        if not pot_path.is_file() or args.extract:
            cmd_extract(Namespace(package=pkginfo.comp_pkg(comp_id), component=[comp_id, ]))

        for locale in locales:
            po_path = catalog_filename(comp_id, locale, mkdir=True)

            with io.open(pot_path, 'r') as pot_fd:
                pot = read_po(pot_fd, locale=locale)
                pot_is_empty = len(pot) == 0 and len(pot.obsolete) == 0

            if not po_path.is_file():
                if pot_is_empty:
                    continue

                logger.info(
                    "Creating component [%s] locale [%s]...",
                    comp_id, locale)

                with io.open(po_path, 'wb') as fd:
                    write_po(fd, pot, width=80, omit_header=True)

                continue

            if pot_is_empty:
                logger.info(
                    "Deleting component [%s] locale [%s]...",
                    comp_id, locale)
                po_path.unlink()
                continue

            with io.open(po_path, 'r') as po_fd:
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

                with io.open(po_path, 'wb') as fd:
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


@attrs
class StatRecord(object):
    package = attrib(default=None)
    component = attrib(default=None)
    locale = attrib(default=None)

    count = attrib(default=0)
    translated = attrib(default=0)
    not_found = attrib(default=0)
    not_translated = attrib(default=0)
    obsolete = attrib(default=0)

    @property
    def completeness(self):
        return self.translated / self.count if self.count != 0 else 1


def group_stat_records(records, keys, with_details=False):
    temp = dict()
    for r in records:
        key = tuple(getattr(r, k) for k in keys)
        agg, details = temp.get(key, (None, None))
        if agg is None:
            agg = StatRecord(**{k: getattr(r, k) for k in keys})
            details = list()
            temp[key] = (agg, details)

        for a in (
            'count', 'translated',
            'not_found', 'not_translated', 'obsolete',
        ):
            setattr(agg, a, getattr(agg, a) + getattr(r, a))

        if with_details:
            details.append(r)

    result = list(temp.values())
    result.sort(key=lambda r: tuple(getattr(r[0], k) for k in keys))
    return (result if with_details else [i[0] for i in result])


def cmd_stat(args):
    data = list()
    all_packages = set()
    all_components = set()
    all_locales = set()

    for comp_id, locales in components_and_locales(
        args, work_in_progress=args.work_in_progress
    ):
        all_packages.add(pkginfo.comp_pkg(comp_id))
        all_components.add(comp_id)

        pot_path = catalog_filename(comp_id, None, ext='pot', mkdir=False)
        if not pot_path.is_file() or args.extract:
            cmd_extract(Namespace(package=pkginfo.comp_pkg(comp_id), component=[comp_id, ]))

        if pot_path.exists():
            with pot_path.open('r') as fd:
                pot = read_po(fd)
        else:
            pot = Catalog()

        for locale in locales:
            all_locales.add(locale)
            po_path = catalog_filename(comp_id, locale, ext='po', mkdir=False)
            if po_path.exists():
                with po_path.open('r') as po_fd:
                    po = read_po(po_fd, locale=locale)
            else:
                po = Catalog(locale=locale)

            not_found, not_translated, obsolete = compare_catalogs(pot, po)
            data.append(StatRecord(
                package=pkginfo.comp_pkg(comp_id),
                component=comp_id,
                locale=locale,
                count=len(pot),
                translated=len(pot) - len(not_found) - len(not_translated),
                not_found=len(not_found),
                not_translated=len(not_translated),
                obsolete=len(obsolete)))

    if args.json:
        print(json.dumps([asdict(i) for i in data], indent=2))
        return

    locales = sorted(list(all_locales))

    len_pkg = max(len('package'), max(len(p) for p in all_packages))
    len_comp = max(len('component'), max(len(c) for c in all_components))
    len_count = 5
    len_loc = 6

    header_cols = ["{:{}}".format(c, lc) for c, lc in (
        ('PACKAGE', len_pkg),
        ('COMPONENT', len_comp),
        ('COUNT', len_count),
    )] + ["{:>{}}".format(lc, len_loc) for lc in locales]

    header = ' '.join(header_cols)
    print(header)
    print('=' * len(header))

    def print_records(records, grouping, title=None):
        if title:
            print("{:-^{}}".format(' ' + title + ' ', len(header)))

        grouped = group_stat_records(records, grouping, with_details=True)
        for r, detail in grouped:
            cols = [
                "{:{}}".format(r.package if r.package else ' ', len_pkg),
                "{:{}}".format(r.component if r.component else ' ', len_comp),
            ]

            by_locale = {r.locale: r for r in group_stat_records(
                detail, ('locale', ))}

            for _, locale_record in by_locale.items():
                cols.append("{:{}}".format(locale_record.count, len_count))
                break

            for locale in locales:
                locale_record = by_locale.get(locale)
                if locale_record is not None:
                    c = locale_record.completeness
                    if c == 1:
                        cols.append("{:>{}}".format('OK', len_loc))
                    else:
                        cols.append("{:>{}.1f}".format(c * 100, len_loc))
                else:
                    cols.append("{:>{}}".format('-', len_loc))

            print(' '.join(cols))

    print_records(data, ('package', 'component', ))
    if len(args.component) == 0:
        print_records(data, ('package', ), title='PACKAGE SUMMARY')


def cmd_poeditor_sync(args):
    opts = env.core.options.with_prefix('locale.poeditor')

    if 'project_id' not in opts:
        raise RuntimeError("POEditor project ID isn't set!")
    poeditor_project_id = opts['project_id']

    if 'api_token' not in opts:
        raise RuntimeError("POEditor API token isn't set!")
    poeditor_api_token = opts['api_token']

    client = POEditorAPI(api_token=poeditor_api_token)

    # Package versions are stored as part of the project's description in the POEditor
    description = POEditorDescription(client, poeditor_project_id)
    local_ver = pkginfo.packages[args.package].version
    if args.package in description.packages:
        remote_ver = description.packages[args.package]

        if pkg_version.parse(local_ver) < pkg_version.parse(remote_ver):
            raise RuntimeError(
                "Version of the '%s' package must be not lower than %s in order to use translations from the POEditor "
                "(current version: %s)."
                % (args.package, remote_ver, local_ver)
            )

    # Update local po-files
    poeditor_terms = {}
    reference_catalogs = {}
    for comp_id, locales in components_and_locales(args, work_in_progress=True):
        cmd_update(Namespace(
            package=pkginfo.comp_pkg(comp_id),
            component=[comp_id, ],
            locale=[lc for lc in locales if lc != 'ru'],
            extract=args.extract,
            force=False))

        for locale in locales:
            if locale == 'ru' and locales != ['ru']:
                po_path = catalog_filename(comp_id, locale)
                if po_path.exists():
                    ref_catalog = reference_catalogs.get(locale)
                    if ref_catalog is None:
                        ref_catalog = Catalog(locale=locale)
                        reference_catalogs[locale] = ref_catalog
                    with po_path.open('r') as po_fd:
                        for m in read_po(po_fd, locale=locale):
                            m.context = comp_id
                            ref_catalog[m.id] = m
                continue

            terms = poeditor_terms.get(locale)
            if not terms:
                logger.debug("Fetching translations from POEditor for locale [%s]...", locale)
                language_code = locale.replace('_', '-').lower()
                terms = client.view_project_terms(poeditor_project_id, language_code=language_code)
                poeditor_terms[locale] = terms

            # Filter terms by context
            terms = [term for term in terms if comp_id == term['context']]

            po_path = catalog_filename(comp_id, locale)

            if not po_path.exists():
                continue

            with po_path.open('r') as po_fd:
                po = read_po(po_fd, locale=locale)

            updated = 0

            for msg in po:
                for term in terms:
                    if msg.id == term['term']:
                        cur_tr = msg.string
                        new_tr = term['translation']['content']

                        if cur_tr != new_tr:
                            msg.string = new_tr
                            updated += 1

                        break

            if updated != 0:
                with io.open(po_path, 'wb') as fd:
                    write_po(fd, po, width=80, omit_header=True)

                logger.info(
                    "%d messages translated for component [%s] locale [%s]",
                    updated, comp_id, locale)

    # Synchronize terms
    remote_terms = defaultdict(set)
    target_state = defaultdict(dict)

    for item in client.view_project_terms(poeditor_project_id):
        remote_terms[item['term']].add(item['context'])

    comps = []
    for comp_id, _ in components_and_locales(args, work_in_progress=True):
        pot_path = catalog_filename(comp_id, '', ext='pot')
        with pot_path.open('r') as fd:
            pot = read_po(fd)
        for msg in pot:
            if msg.id == '':
                continue
            target_state[msg.id][comp_id] = True
        comps.append(comp_id)

    for comp_id in comps:
        for msg_id in target_state:
            if comp_id not in target_state[msg_id]:
                target_state[msg_id][comp_id] = False

    terms_to_add = []
    terms_to_del = []
    for msg_id in target_state:
        if msg_id not in remote_terms:
            for comp_id in target_state[msg_id]:
                if target_state[msg_id][comp_id]:
                    logger.debug("ADD (%s, %s)", comp_id, msg_id)
                    terms_to_add.append(dict(term=msg_id, context=comp_id))
            continue

        for comp_id in target_state[msg_id]:
            if target_state[msg_id][comp_id] and comp_id not in remote_terms[msg_id]:
                logger.debug("ADD (%s, %s)", comp_id, msg_id)
                terms_to_add.append(dict(term=msg_id, context=comp_id))
            if not target_state[msg_id][comp_id] and comp_id in remote_terms[msg_id]:
                logger.debug("DEL (%s, %s)", comp_id, msg_id)
                terms_to_del.append(dict(term=msg_id, context=comp_id))

    for msg_id, contexts in remote_terms.items():
        if msg_id not in target_state:
            for comp_id in contexts:
                if comp_id in comps:
                    logger.debug("DEL (%s, %s)", comp_id, msg_id)
                    terms_to_del.append(dict(term=msg_id, context=comp_id))

    if len(terms_to_add) > 0 and args.no_dry_run:
        client.add_terms(poeditor_project_id, terms_to_add)
    logger.info("%d messages added to the POEditor", len(terms_to_add))

    if len(terms_to_del) > 0 and args.no_dry_run:
        client.delete_terms(poeditor_project_id, terms_to_del)
    logger.info("%d messages deleted from the POEditor", len(terms_to_del))

    if len(reference_catalogs) > 0:
        logger.info(
            "Upload the following reference translations to POEditor: "
            + ", ".join(reference_catalogs.keys()))
        if args.no_dry_run:
            wait_for_rate_limit = False
            for locale, catalog in reference_catalogs.items():
                with NamedTemporaryFile(suffix='.po') as fd:
                    write_po(fd, catalog, width=80, omit_header=True)
                    fd.flush()
                    logger.debug(
                        "Uploading %s reference translation...",
                        locale)

                    # Free account allows doing 1 upload per 20 seconds
                    sleep(20 if wait_for_rate_limit else 0)
                    wait_for_rate_limit = True

                    client.update_terms_translations(
                        project_id=poeditor_project_id,
                        language_code=locale.replace('-', '_'),
                        overwrite=True, sync_terms=False,
                        file_path=fd.name)

    if len(terms_to_add) > 0 or len(terms_to_del) > 0:
        if args.no_dry_run:
            description.update(args.package, local_ver)
        logger.info(
            "Set '%s' package version to %s in the POEditor.", args.package, local_ver
        )

    # TODO: Russian language as a reference


class POEditorDescription:
    def __init__(self, client, project_id):
        self.client = client
        self.project_id = project_id
        self.packages = []
        self.populate()

    def populate(self):
        details = self.client.view_project_details(self.project_id)
        self.packages = json.loads(re.search(r'\((.+?)\)', details['description']).group(1))

    def update(self, package, version):
        self.packages[package] = version
        description = '[//]: # (%s)' % (json.dumps(self.packages))
        self.client.update_project(project_id=self.project_id, description=description)


def main(argv=sys.argv):
    logging.basicConfig(level=logging.INFO)

    parser = ArgumentParser()
    parser.add_argument('-p', '--package', default='nextgisweb')
    parser.add_argument('--all-packages', action='store_true', default=False)
    parser.add_argument('--config')

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
    pstat.add_argument('--extract', action='store_true', default=False)
    pstat.add_argument('--locale', default=[], action='append')
    pstat.add_argument('--work-in-progress', action='store_true', default=False)
    pstat.add_argument('--json', action='store_true', default=False)
    pstat.set_defaults(func=cmd_stat)

    ppoeditor_pull = subparsers.add_parser('poeditor-sync')
    ppoeditor_pull.add_argument('component', nargs='*')
    ppoeditor_pull.add_argument('--extract', action='store_true', default=False)
    ppoeditor_pull.add_argument('--locale', default=[], action='append')
    ppoeditor_pull.add_argument('--no-dry-run', action='store_true', default=False)
    ppoeditor_pull.set_defaults(func=cmd_poeditor_sync)

    args = parser.parse_args(argv[1:])

    env = Env(cfg=load_config(args.config, None), enable_disabled=True)
    setenv(env)

    args.func(args)
