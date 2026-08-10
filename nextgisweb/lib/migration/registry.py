from __future__ import annotations

import re
from datetime import datetime
from functools import cached_property
from importlib.util import module_from_spec, spec_from_file_location
from json import dumps as json_dumps
from pathlib import Path
from re import Pattern
from typing import Annotated, Literal, cast

from msgspec import Meta, Struct
from msgspec.json import decode

from nextgisweb.lib.logging import logger

from .migration import Dependency, InitialMigration, Migration, MigrationKey
from .revision import REVID_ZERO

PLACEHOLDER = "TODO: Write code here and remove this placeholder line!"

RevisionID = Annotated[str, Meta(pattern=r"^[0-9a-f]{8}$")]
RevisionRef = Annotated[str, Meta(pattern=r"^\w+==[0-9a-f]{8}$")]
RevisionRefThis = Annotated[str, Meta(pattern=r"^\w+==[0-9a-f]{8}|this$")]
DependencySpec = tuple[RevisionRefThis, RevisionRefThis]


class MigrationHeaderRaw(Struct, kw_only=True, forbid_unknown_fields=True):
    revision: RevisionID
    parents: tuple[RevisionID, ...]
    dependencies: tuple[DependencySpec | RevisionRef, ...] = ()
    date: Annotated[datetime, Meta(tz=False)] = datetime(1970, 1, 1, 0, 0, 0)
    message: str = ""

    def populate_to(self, migration: Migration):
        assert self.revision == migration.revision, "Revision mismatch!"

        dependencies = ()
        for d in self.dependencies:
            if isinstance(d, str):
                d = ("this", d)
            ds = tuple()
            for r in d:
                if r == "this":
                    r = "{}=={}".format(migration.component, migration.revision)
                ds = ds + (r,)
            dependencies = dependencies + (cast(tuple[str, str], ds),)

        migration._parents = tuple(MigrationKey(migration.component, r) for r in self.parents)
        migration._dependencies = [(Dependency(i[0]), Dependency(i[1])) for i in dependencies]
        migration._date = self.date
        migration._message = self.message


class MigrationHeaderRawRewind(Struct, kw_only=True, forbid_unknown_fields=True):
    revision: RevisionID


def _extract_header[T](t: type[T], path: Path, *, regexp: Pattern) -> tuple[T, str]:
    m = regexp.match(path.read_text())
    if not m:
        raise ValueError("Failed to extract header from {}".format(path))

    meta_str, body = m.groups()
    meta_json = decode(meta_str, type=t)
    return meta_json, body


def _format_header_json(meta: dict, direction: Literal["forward", "rewind"]) -> str:
    match direction:
        case "forward":
            groups = (("revision", "parents"), "date", "message", "dependencies")
        case "rewind":
            groups = ("revision",)
        case _:
            raise ValueError

    lines = list()
    for group in groups:
        line_kv = {}
        for k in (group,) if isinstance(group, str) else group:
            try:
                v = meta[k]
            except KeyError:
                continue
            else:
                if isinstance(v, datetime):
                    v = v.replace(microsecond=0).isoformat()
                line_kv[k] = v

        if len(line_kv) > 0:
            line = json_dumps(line_kv)[1:-1]
            lines.append(line)

    return (
        ("{\n" + ",\n".join(("    " + ln) for ln in lines) + "\n}")
        if len(lines) > 1
        else "{ " + ", ".join(lines) + " }"
    )


class PythonModuleMigration(Migration):
    _regexp_file = re.compile(r"^([0-9a-z]+)(?:\-.*)?\.py$")

    @classmethod
    def scandir(cls, component, path):
        for fn in path.glob("*.py"):
            m = cls._regexp_file.match(fn.name)
            if m and fn.is_file():
                revision = m.group(1).lower()
                yield PythonModuleMigration(component, revision, fn)
            else:
                logger.warning("Failed to identify python migration: {}".format(fn))

    _regexp_meta = re.compile(r"^(?:\s*\#[^\n]*\n|\s*\n)*\"{3}\s*(\{.+\})\s*\"{3}\s*(.*)$", re.S)
    _regexp_forward = re.compile(r"def\s+forward\s*\(")
    _regexp_rewind = re.compile(r"def\s+rewind\s*\(")

    def __init__(self, component, revision, mpath):
        super().__init__(component, revision)
        self._mod_path = str(mpath)

        raw, body = _extract_header(MigrationHeaderRaw, mpath, regexp=self._regexp_meta)
        raw.populate_to(self)

        self._has_forward = self._regexp_forward.search(body) is not None
        self._has_rewind = self._regexp_rewind.search(body) is not None

    @classmethod
    def template(cls, path, revision, forward=True, rewind=True, **meta):
        meta["revision"] = revision

        message = meta.get("message")
        basename = revision + ("-" + _slugify(message) if message else "")

        fwpath = path / "{}.py".format(basename)
        assert not fwpath.exists()
        with fwpath.open("w") as fd:
            fd.write(f'"""{_format_header_json(meta, "forward")}"""\n')

            defs = [forward and "forward", rewind and "rewind"]
            for dn in filter(None, defs):
                fd.write("\n\n")
                fd.write("def {}(ctx):\n".format(dn))
                fd.write("    pass  # {}\n".format(PLACEHOLDER))

        return (fwpath,)

    @cached_property
    def module(self):
        spec = spec_from_file_location("", self._mod_path)
        assert spec is not None

        module = module_from_spec(spec)
        loader = spec.loader
        assert loader is not None

        loader.exec_module(module)
        return module

    @property
    def forward_callable(self):
        return getattr(self.module, "forward")

    @property
    def rewind_callable(self):
        return getattr(self.module, "rewind")


class SQLScriptMigration(Migration):
    _regexp_file = re.compile(r"^([0-9a-z]+)(?:\-.*)?\.fw\.sql$")

    @classmethod
    def scandir(cls, component, path):
        for fn in path.glob("*.fw.sql"):
            m = cls._regexp_file.match(fn.name)
            if m:
                revision = m.group(1).lower()
                migration = SQLScriptMigration(component, revision, fn)
                yield migration
            else:
                logger.warning("Failed to identify SQL script migration: {}".format(fn))

    @classmethod
    def template(cls, path, revision, forward=True, rewind=True, **meta):
        meta["revision"] = revision

        outfiles = list()
        message = meta.get("message")
        basename = revision + ("-" + _slugify(message) if message else "")

        fwpath = path / "{}.fw.sql".format(basename)
        assert not fwpath.exists()
        with fwpath.open("w") as fd:
            fd.write(f"/*** {_format_header_json(meta, 'forward')} ***/\n\n")
            if forward:
                fd.write("-- {}\n".format(PLACEHOLDER))
            outfiles.append(fwpath)

        if rewind:
            rwpath = path / "{}.rw.sql".format(basename)
            assert not rwpath.exists()
            with rwpath.open("w") as fd:
                rwmeta = {"revision": revision}
                fd.write(f"/*** {_format_header_json(rwmeta, 'rewind')} ***/\n\n")
                fd.write("-- {}\n".format(PLACEHOLDER))
            outfiles.append(rwpath)

        return tuple(outfiles)

    _regexp_meta = re.compile(r"^\/\*{3}\s*(\{.+\})\s*\*{3}\/\s*(.*)$", re.I + re.S)

    def __init__(self, component, revision, fwpath):
        super().__init__(component, revision)
        self.fwpath = fwpath

        fwraw = _extract_header(MigrationHeaderRaw, fwpath, regexp=self._regexp_meta)[0]
        fwraw.populate_to(self)
        self._has_forward = True

        revpath = Path(re.sub(r"\.fw\.sql$", ".rw.sql", str(fwpath)))
        self._has_rewind = revpath.is_file()
        if self._has_rewind:
            self.rwpath = revpath
            rwraw = _extract_header(MigrationHeaderRawRewind, revpath, regexp=self._regexp_meta)[0]
            assert rwraw.revision == revision, "Rewind revision mismatch!"
        else:
            self.rwpath = None

    def forward_script(self):
        return self.fwpath.read_text()

    def rewind_script(self):
        return self.rwpath.read_text()


class Registry:
    def __init__(self):
        self._all_migrations = dict()
        self._by_component = dict()
        self._validated = False

    def add(self, migration):
        assert not self._validated, "Registry already has validated!"

        assert migration.key not in self._all_migrations
        self._all_migrations[migration.key] = migration

        cmigs = self._by_component.setdefault(migration.component, dict())
        assert migration.key not in cmigs
        cmigs[migration.key] = migration

        for p in migration.parents:
            if p.revision == REVID_ZERO:
                if MigrationKey(migration.component, REVID_ZERO) not in cmigs:
                    self.add(InitialMigration(migration.component))

        for e, d in migration.dependencies:
            if d.revision == REVID_ZERO:
                dmigs = self._by_component.setdefault(d.component, dict())
                if MigrationKey(d.component, REVID_ZERO) not in dmigs:
                    self.add(InitialMigration(d.component))

    def scandir(self, component, path):
        for c in (PythonModuleMigration, SQLScriptMigration):
            for m in c.scandir(component, path):
                self.add(m)

    def validate(self):
        mkeys = list(self._all_migrations.keys())
        mkeys.sort(key=lambda i: i.revision)
        self._all_migrations = {k: self._all_migrations[k] for k in mkeys}
        self._validated = True


def _slugify(message):
    result = message.lower()
    result = re.sub(r"\W", "-", result)
    result = re.sub(r"\-+", "-", result)
    result = re.sub(r"^\-", "", result)
    result = re.sub(r"\-$", "", result)
    return result
