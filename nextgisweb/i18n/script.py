import io
import json
import logging
import re
import sys
from argparse import ArgumentParser, Namespace
from collections import defaultdict
from functools import partial
from importlib import import_module
from packaging import version as pkg_version
from pathlib import Path
from tempfile import NamedTemporaryFile
from time import sleep

from babel.messages.catalog import Catalog, Message
from babel.messages.mofile import write_mo
from babel.messages.plurals import get_plural
from babel.messages.pofile import read_po
from msgspec import Struct, to_builtins
from poeditor import POEditorAPI

from nextgisweb.env import Env, env
from nextgisweb.env.i18n.extract import extract_component
from nextgisweb.env.package import pkginfo
from nextgisweb.lib.config import load_config
from nextgisweb.lib.logging import logger

from .util import to_gettext_locale, to_http_locale, write_po


def compare_catalogs(ca, cb):
    not_found = []
    not_translated = []
    obsolete = []

    for ma in ca:
        if ma.id == "":
            continue
        ka = (ma.id, ma.context)
        mb = cb.get(*ka)
        if not mb:
            not_found.append(ka)
            continue
        if not mb.string:
            not_translated.append(ka)

    for mb in cb:
        if mb.id == "":
            continue
        kb = (mb.id, mb.context)
        ma = ca.get(*kb)
        if ma is None:
            obsolete.append(kb)

    return not_found, not_translated, obsolete


def catalog_filename(component, locale, ext="po", internal=False, mkdir=False):
    if locale is None:
        locale = ""

    external_path = env.core.options["locale.external_path"]
    if internal or locale == "" or locale == "ru":
        cpath = Path(import_module(pkginfo.comp_mod(component)).__path__[0])
        base = cpath / "locale"
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


class ComponentMeta(Struct, kw_only=True):
    comp: str
    pkg: str
    locales: list[str]
    external: bool


def components_and_locales(args, work_in_progress=False):
    ext_meta = dict()
    if ext_path := env.core.options["locale.external_path"]:
        ext_meta_path = Path(ext_path) / "metadata.json"
        ext_meta = json.loads(ext_meta_path.read_text())

    ext_packages = ext_meta.get("packages", [])
    ext_locales = ext_meta.get("locales", [])

    filter_package = []
    filter_comp = []

    if args.package is not None and args.package != "all":
        if args.package not in pkginfo.packages:
            raise RuntimeError("Package %s not found." % args.package)
        filter_package.append(args.package)

    check_package = len(filter_package) == 0
    for k in args.compackage:
        if k in env.components:
            filter_comp.append(k)
        elif check_package and k in pkginfo.packages:
            filter_package.append(k)
        else:
            raise RuntimeError("Component or package [%s] not found.", k)

    for comp_id in env.components.keys():
        if len(filter_comp) > 0 and comp_id not in filter_comp:
            continue

        pkg = pkginfo.comp_pkg(comp_id)
        if len(filter_package) > 0 and pkg not in filter_package:
            continue

        external = pkg in ext_packages

        if len(getattr(args, "locale", [])) > 0:
            locales = list(args.locale)
        else:
            locales = ["ru", *(ext_locales if external else [])]
            if work_in_progress and external:
                comp_path = Path(ext_path) / pkg / comp_id
                for fn in comp_path.glob("*.po"):
                    candidate = fn.with_suffix("").name
                    if re.fullmatch(r"\w{2,3}(-\w{2,3})?", candidate):
                        if candidate not in locales:
                            locales.append(candidate)

        locales.sort()
        logger.debug("Locale list for [%s] = %s", comp_id, " ".join(locales))

        yield ComponentMeta(
            comp=comp_id,
            pkg=pkg,
            locales=locales,
            external=external,
        )


def cmd_extract(args):
    for meta in components_and_locales(args):
        catalog = extract_component(meta.comp)
        logger.info("%d messages extracted from component [%s]", len(catalog), meta.comp)

        outfn = catalog_filename(meta.comp, None, ext="pot", mkdir=True)
        logger.debug("Writing POT-file to %s", outfn)

        write_po(outfn, catalog, ignore_obsolete=True)


def cmd_update(args):
    for meta in components_and_locales(args, work_in_progress=True):
        pot_path = catalog_filename(meta.comp, "", ext="pot", mkdir=True)

        if not pot_path.is_file() or args.extract:
            cmd_extract(Namespace(package=None, compackage=[meta.comp]))

        for locale in meta.locales:
            po_path = catalog_filename(meta.comp, locale, mkdir=True)

            with io.open(pot_path, "r") as pot_fd:
                pot = read_po(pot_fd, locale=to_gettext_locale(locale))
                pot_is_empty = len(pot) == 0 and len(pot.obsolete) == 0

            if not po_path.is_file():
                if pot_is_empty:
                    continue

                logger.info("Creating component [%s] locale [%s]...", meta.comp, locale)
                write_po(po_path, pot)

                continue

            if pot_is_empty:
                logger.info("Deleting component [%s] locale [%s]...", meta.comp, locale)
                po_path.unlink()
                continue

            with io.open(po_path, "r") as po_fd:
                po = read_po(po_fd, locale=to_gettext_locale(locale))

            not_found, _, obsolete = compare_catalogs(pot, po)

            if not_found or obsolete or args.force:
                logger.info("Updating component [%s] locale [%s]...", meta.comp, locale)

                po.update(pot, True)

                for m in po:
                    m.flags = set()

                # Remove obsolete untranslated messages, but keep translated
                # ones. If the --no-obsolete flag is set, remove all obsolete
                # messages.

                no_obsolete = args.no_obsolete
                for key, msg in list(po.obsolete.items()):
                    if no_obsolete or msg.string == "":
                        del po.obsolete[key]

                write_po(po_path, po)


def update_catalog_using_ai_catalog(
    catalog: Catalog,
    ai_catalog: Catalog,
):
    for ai_msg in ai_catalog:
        if ai_msg.id == "":
            continue
        if ai_msg.id not in catalog._messages:
            catalog[ai_msg.id] = ai_msg
        else:
            if catalog[ai_msg.id].string == "":
                del catalog[ai_msg.id]
                catalog[ai_msg.id] = ai_msg


def cmd_compile(args):
    for meta in components_and_locales(args, work_in_progress=False):
        for locale in meta.locales:
            catfn = partial(catalog_filename, meta.comp, locale)
            po_path = catfn()
            if not po_path.exists():
                mo_path = catfn(ext="mo", internal=True)
                if mo_path.exists():
                    mo_path.unlink()
                continue

            with po_path.open("r") as po:
                catalog = read_po(po, locale=to_gettext_locale(locale), domain=meta.comp)

            catalog_ai = None
            cat_ai_fn = partial(catalog_filename, meta.comp, locale, "ai.po")
            ai_po_path = cat_ai_fn()
            if ai_po_path.exists():
                with ai_po_path.open("r") as ai_po:
                    catalog_ai = read_po(ai_po, locale=to_gettext_locale(locale), domain=meta.comp)

            if catalog_ai:
                update_catalog_using_ai_catalog(catalog, catalog_ai)

            logger.info(
                "Compiling component [%s] locale [%s] (%d messages)...",
                meta.comp,
                locale,
                len(catalog),
            )

            with catfn(ext="mo", internal=True, mkdir=True).open("wb") as mo:
                write_mo(mo, catalog)


class StatRecord(Struct, kw_only=True):
    package: str | None = None
    component: str | None = None
    locale: str | None = None

    count: int = 0
    translated: int = 0
    not_found: int = 0
    not_translated: int = 0
    obsolete: int = 0

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
            "count",
            "translated",
            "not_found",
            "not_translated",
            "obsolete",
        ):
            setattr(agg, a, getattr(agg, a) + getattr(r, a))

        if with_details:
            details.append(r)

    result = list(temp.values())
    result.sort(key=lambda r: tuple(getattr(r[0], k) for k in keys))
    return result if with_details else [i[0] for i in result]


def cmd_stat(args):
    data = list()
    all_packages = set()
    all_components = set()
    all_locales = set()

    for meta in components_and_locales(args, work_in_progress=args.work_in_progress):
        all_packages.add(meta.pkg)
        all_components.add(meta.comp)

        pot_path = catalog_filename(meta.comp, None, ext="pot", mkdir=False)
        if not pot_path.is_file() or args.extract:
            cmd_extract(Namespace(package=None, compackage=[meta.comp]))

        if pot_path.exists():
            with pot_path.open("r") as fd:
                pot = read_po(fd)
        else:
            pot = Catalog()

        for locale in meta.locales:
            all_locales.add(locale)
            po_path = catalog_filename(meta.comp, locale, ext="po", mkdir=False)
            if po_path.exists():
                with po_path.open("r") as po_fd:
                    po = read_po(po_fd, locale=to_gettext_locale(locale))
            else:
                po = Catalog(locale=to_gettext_locale(locale))

            if args.ai:
                ai_po_path = catalog_filename(meta.comp, locale, ext="ai.po", mkdir=False)
                if ai_po_path.exists():
                    with ai_po_path.open("r") as ai_po_fd:
                        ai_po = read_po(ai_po_fd, locale=to_gettext_locale(locale))
                        update_catalog_using_ai_catalog(po, ai_po)

            not_found, not_translated, obsolete = compare_catalogs(pot, po)
            data.append(
                StatRecord(
                    package=meta.pkg,
                    component=meta.comp,
                    locale=locale,
                    count=len(pot),
                    translated=len(pot) - len(not_found) - len(not_translated),
                    not_found=len(not_found),
                    not_translated=len(not_translated),
                    obsolete=len(obsolete),
                )
            )

    if args.json:
        print(json.dumps([to_builtins(i) for i in data], indent=2))
        return

    locales = sorted(list(all_locales))

    len_pkg = max(len("package"), max(len(p) for p in all_packages))
    len_comp = max(len("component"), max(len(c) for c in all_components))
    len_count = 5
    len_loc = 6

    header_cols = [
        "{:{}}".format(c, lc)
        for c, lc in (
            ("PACKAGE", len_pkg),
            ("COMPONENT", len_comp),
            ("COUNT", len_count),
        )
    ] + ["{:>{}}".format(lc, len_loc) for lc in locales]

    header = " ".join(header_cols)
    print(header)
    print("=" * len(header))

    def print_records(records, grouping, title=None):
        if title:
            print("{:-^{}}".format(" " + title + " ", len(header)))

        grouped = group_stat_records(records, grouping, with_details=True)
        for r, detail in grouped:
            cols = [
                "{:{}}".format(r.package if r.package else " ", len_pkg),
                "{:{}}".format(r.component if r.component else " ", len_comp),
            ]

            by_locale = {r.locale: r for r in group_stat_records(detail, ("locale",))}

            for _, locale_record in by_locale.items():
                cols.append("{:{}}".format(locale_record.count, len_count))
                break

            for locale in locales:
                locale_record = by_locale.get(locale)
                if locale_record is not None:
                    c = locale_record.completeness
                    if c == 1:
                        cols.append("{:>{}}".format("OK", len_loc))
                    else:
                        cols.append("{:>{}.1f}".format(c * 100, len_loc))
                else:
                    cols.append("{:>{}}".format("-", len_loc))

            print(" ".join(cols))

    print_records(
        data,
        (
            "package",
            "component",
        ),
    )
    if len(args.compackage) == 0:
        print_records(data, ("package",), title="PACKAGE SUMMARY")


class POEditorDescription:
    def __init__(self, client, project_id):
        self.client = client
        self.project_id = project_id
        self.populate()

    def populate(self):
        details = self.client.view_project_details(self.project_id)
        self.packages = json.loads(re.search(r"\((.+?)\)", details["description"]).group(1))

    def update(self, pversions):
        self.packages.update(pversions)
        description = "[//]: # (%s)" % (json.dumps(self.packages))
        self.client.update_project(project_id=self.project_id, description=description)


def _to_poeditor_context(comp_id: str, context: str | None) -> str:
    return comp_id if not context else f"{comp_id}:{context}"


def _from_poeditor_context(context: str) -> tuple[str, str | None]:
    parts = context.split(":", maxsplit=1)
    return parts[0], parts[1] if len(parts) > 1 else None


def _poeditor_translation(term: dict, num_plurals: int):
    content = term["translation"]["content"]
    if isinstance(content, str):
        return content

    result = (content.get("one", ""),)
    if num_plurals >= 1:
        result += (content.get("few", ""),)
    if num_plurals >= 2:
        result += (content.get("many", ""),)
    if num_plurals >= 3:
        result += (content.get("other", ""),)
    return result


def cmd_poeditor_sync(args):
    opts = env.core.options.with_prefix("locale.poeditor")

    if "project_id" not in opts:
        raise RuntimeError("POEditor project ID isn't set!")
    poeditor_project_id = opts["project_id"]

    if "api_token" not in opts:
        raise RuntimeError("POEditor API token isn't set!")
    poeditor_api_token = opts["api_token"]

    client = POEditorAPI(api_token=poeditor_api_token)

    # Package versions are stored as part of the project's description in the POEditor
    description = POEditorDescription(client, poeditor_project_id)
    pversions = dict()

    # Update local po-files
    poeditor_terms = {}
    reference_catalogs = {}
    for meta in components_and_locales(args, work_in_progress=True):
        if not meta.external:
            continue

        if meta.pkg not in pversions:
            local_ver = pkginfo.packages[meta.pkg].version
            remote_ver = description.packages.get(meta.pkg)
            if remote_ver and pkg_version.parse(local_ver) < pkg_version.parse(remote_ver):
                raise RuntimeError(
                    "Version of the '%s' package must be not lower "
                    "than %s in order to use translations from the POEditor "
                    "(current version: %s)." % (meta.pkg, remote_ver, local_ver)
                )
            if local_ver != remote_ver:
                pversions[meta.pkg] = local_ver

        cmd_update(
            Namespace(
                package=None,
                compackage=[meta.comp],
                locale=[lc for lc in meta.locales if lc != "ru"],
                extract=args.extract,
                no_obsolete=True,
                force=False,
            )
        )

        for locale in meta.locales:
            if locale == "ru" and meta.locales != ["ru"]:
                po_path = catalog_filename(meta.comp, locale)
                if po_path.exists():
                    ref_catalog = reference_catalogs.get(locale)
                    if ref_catalog is None:
                        ref_catalog = Catalog(locale=to_gettext_locale(locale))
                        reference_catalogs[locale] = ref_catalog
                    with po_path.open("r") as po_fd:
                        for m in read_po(po_fd, locale=to_gettext_locale(locale)):
                            m.context = _to_poeditor_context(meta.comp, m.context)
                            ref_catalog[m.id] = m
                continue

            terms = poeditor_terms.get(locale)
            if not terms:
                logger.debug("Fetching translations from POEditor for locale [%s]...", locale)
                terms = client.view_project_terms(
                    poeditor_project_id,
                    language_code=to_http_locale(locale),
                )
                poeditor_terms[locale] = terms

            poeditor_messages = dict[tuple[str | None, str | tuple[str, str]], Message]()
            poeditor_num_plurals = get_plural(to_gettext_locale(locale))[0]
            for term in terms:
                term_domain, term_context = _from_poeditor_context(term["context"])
                if term_domain != meta.comp:
                    continue

                poeditor_message_id = term["term"]
                if poeditor_plural := term.get("plural"):
                    poeditor_message_id = (poeditor_message_id, poeditor_plural)

                poeditor_message_translation = _poeditor_translation(term, poeditor_num_plurals)
                poeditor_messages[(term_context, poeditor_message_id)] = Message(
                    poeditor_message_id,
                    poeditor_message_translation,
                    context=term_context,
                )

            po_path = catalog_filename(meta.comp, locale)

            if not po_path.exists():
                continue

            with po_path.open("r") as po_fd:
                po = read_po(po_fd, locale=to_gettext_locale(locale))

            updated = 0

            for msg in po:
                if poeditor_message := poeditor_messages.get((msg.context, msg.id)):
                    if msg.string != poeditor_message.string:
                        msg.string = poeditor_message.string
                        updated += 1

            if updated != 0:
                write_po(po_path, po)
                logger.info(
                    "%d messages translated for component [%s] locale [%s]",
                    updated,
                    meta.comp,
                    locale,
                )

    # Synchronize terms

    remote_terms = defaultdict(set)
    for term in client.view_project_terms(poeditor_project_id):
        term_domain, term_context = _from_poeditor_context(term["context"])
        term_plural = term["plural"] or None
        remote_terms[term_domain].add((term_context, term["term"], term_plural))

    local_terms = defaultdict(set)
    for meta in components_and_locales(args, work_in_progress=True):
        if not meta.external:
            continue

        pot_path = catalog_filename(meta.comp, "", ext="pot")
        with pot_path.open("r") as fd:
            pot = read_po(fd)

        for msg in pot:
            if msg.id == "":
                continue
            local_terms[meta.comp].add(
                (msg.context, *((msg.id, None) if not msg.pluralizable else msg.id))
            )

    to_add = []
    to_del = []
    for comp_id, local in local_terms.items():
        remote = remote_terms[comp_id]

        to_add_comp = local.difference(remote)
        to_del_comp = remote.difference(local)

        to_add.extend(
            (_to_poeditor_context(comp_id, context), message, plural)
            for context, message, plural in to_add_comp
        )

        to_del.extend(
            (_to_poeditor_context(comp_id, context), message, plural)
            for context, message, plural in to_del_comp
        )

    # Show changes

    if not to_add and not to_del:
        print("POEditor is already up-to-date!")
        return

    if to_add:
        print("Terms to ADD:", *(f" + {i[0]:26} {i[1]}" for i in to_add), "", sep="\n")
    if to_del:
        print("Terms to DELETE:", *(f" - {i[0]:26} {i[1]}" for i in to_del), "", sep="\n")
    if pversions:
        f = (f" * {p} to {v}" for p, v in pversions.items())
        print("Package version changes:", *f, "", sep="\n")

    # Apply changes

    if not args.no_dry_run:
        print("Use --no-dry-run option to apply these changes!")
        return

    _to_term = lambda item: dict(zip(("context", "term", "plural"), item))

    if to_add:
        logger.info("Adding %d terms to POEditor...", len(to_add))
        client.add_terms(poeditor_project_id, [_to_term(i) for i in to_add])

    if to_del:
        logger.info("Deleting %d terms to POEditor...", len(to_del))
        client.delete_terms(poeditor_project_id, [_to_term(i) for i in to_del])

    if pversions:
        logger.info("Updating %d package versions in POEditor...", len(pversions))
        description.update(pversions)

    if reference_catalogs:
        wait_for_rate_limit = False
        for locale, catalog in reference_catalogs.items():
            logger.info("Uploading %s POEditor reference translation...", locale)
            with NamedTemporaryFile(suffix=".po") as fd:
                write_po(Path(fd.name), catalog)

                # Free account allows doing 1 upload per 20 seconds
                sleep(20 if wait_for_rate_limit else 0)
                wait_for_rate_limit = True

                client.update_terms_translations(
                    project_id=poeditor_project_id,
                    language_code=to_gettext_locale(locale),
                    overwrite=True,
                    sync_terms=False,
                    file_path=fd.name,
                )


def main(argv=sys.argv):
    logging.basicConfig(level=logging.INFO)

    parser = ArgumentParser()
    parser.add_argument("--config")

    # TODO: Remove these two arguments
    parser.add_argument("-p", "--package")
    parser.add_argument("--all-packages", dest="package", action="store_const", const="all")

    subparsers = parser.add_subparsers()

    pextract = subparsers.add_parser("extract")
    pextract.add_argument("compackage", nargs="*")
    pextract.set_defaults(func=cmd_extract)

    pupdate = subparsers.add_parser("update")
    pupdate.add_argument("compackage", nargs="*")
    pupdate.add_argument("--locale", default=[], action="append")
    pupdate.add_argument("--force", action="store_true", default=False)
    pupdate.add_argument("--extract", action="store_true", default=True)
    pupdate.add_argument("--no-extract", dest="extract", action="store_false")
    pupdate.add_argument("--no-obsolete", action="store_true", default=False)
    pupdate.set_defaults(func=cmd_update)

    pcompile = subparsers.add_parser("compile")
    pcompile.add_argument("compackage", nargs="*")
    pcompile.set_defaults(func=cmd_compile)

    pstat = subparsers.add_parser("stat")
    pstat.add_argument("compackage", nargs="*")
    pstat.add_argument("--extract", action="store_true", default=True)
    pstat.add_argument("--no-extract", dest="extract", action="store_false")
    pstat.add_argument("--locale", default=[], action="append")
    pstat.add_argument("--work-in-progress", action="store_true", default=False)
    pstat.add_argument("--json", action="store_true", default=False)
    pstat.add_argument(
        "--ai", action="store_true", default=False, help="Include AI translations in statistics"
    )
    pstat.set_defaults(func=cmd_stat)

    ppoeditor_pull = subparsers.add_parser("poeditor-sync")
    ppoeditor_pull.add_argument("compackage", nargs="*")
    ppoeditor_pull.add_argument("--extract", action="store_true", default=True)
    ppoeditor_pull.add_argument("--no-extract", dest="extract", action="store_false")
    ppoeditor_pull.add_argument("--locale", default=[], action="append")
    ppoeditor_pull.add_argument("--no-dry-run", action="store_true", default=False)
    ppoeditor_pull.set_defaults(func=cmd_poeditor_sync)

    args = parser.parse_args(argv[1:])

    Env(cfg=load_config(args.config, None), enable_disabled=True, set_global=True)

    args.func(args)
