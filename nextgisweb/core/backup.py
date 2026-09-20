from __future__ import annotations

import os
import re
from collections.abc import Callable, Iterable, Iterator
from contextlib import contextmanager
from datetime import datetime
from functools import cache
from packaging.version import Version
from pathlib import Path
from shlex import join as shlex_join
from subprocess import check_call, check_output
from typing import Any, BinaryIO, ClassVar, Protocol, TextIO

import sqlalchemy as sa
import transaction
from msgspec import Struct
from msgspec.json import decode
from zope.sqlalchemy import mark_changed

from nextgisweb.env import Component, DBSession, env
from nextgisweb.env.hook import ComponentHook, ComponentHookProtocol
from nextgisweb.lib.json import dumps
from nextgisweb.lib.logging import logger
from nextgisweb.lib.registry import DictRegistry, dict_registry


class IndexRecord(Struct):
    id: int
    identity: str
    payload: Any


class IndexFile:
    def __init__(self, path: Path) -> None:
        self.path = path

    @contextmanager
    def writer(self) -> Iterator[Callable[[IndexRecord], None]]:
        fd: TextIO | None = None

        def write(record: IndexRecord) -> None:
            nonlocal fd

            if fd is None:
                fd = self.path.open("w", newline="\n", encoding="utf-8")

            data = dumps(record, pretty=False)
            assert "\n" not in data
            fd.write(data)

            fd.write("\n")

        try:
            yield write
        finally:
            if fd is not None:
                fd.close()

    @contextmanager
    def reader(self) -> Iterator[Iterator[IndexRecord]]:
        with self.path.open(newline="\n", encoding="utf-8") as fp:

            def read() -> Iterator[IndexRecord]:
                for line in fp:
                    record = decode(line, type=IndexRecord)
                    assert isinstance(record, IndexRecord)
                    yield record

            yield read()


@dict_registry
class BackupBase:
    registry: ClassVar[DictRegistry[type[BackupBase]]]

    identity: ClassVar[str]
    blob: ClassVar[bool] = False

    def __init__(self, payload: Any) -> None:
        self.payload = payload

    def backup(self, dst: BinaryIO) -> None:
        raise NotImplementedError

    def restore(self, src: BinaryIO) -> None:
        raise NotImplementedError


class BackupConfiguration:
    def __init__(self) -> None:
        self._exclude_table = list()
        self._exclude_table_data = list()

    def exclude_table(self, schema: str, table: str) -> None:
        self._exclude_table.append("{}.{}".format(schema, table))

    def exclude_table_data(self, schema: str, table: str) -> None:
        self._exclude_table_data.append("{}.{}".format(schema, table))


class BackupConfigureProtocol(ComponentHookProtocol, Protocol):
    def __call__[C: Component](self, comp: C, config: BackupConfiguration) -> None: ...


backup_configure_hook = ComponentHook[BackupConfigureProtocol]("backup_configure_hook")


BackupObjectsResult = Iterator[BackupBase]


class BackupObjectsProtocol(ComponentHookProtocol, Protocol):
    def __call__[C: Component](self, comp: C) -> BackupObjectsResult: ...


backup_objects_hook = ComponentHook[BackupObjectsProtocol]("backup_objects_hook")


class RestorePrepareProtocol(ComponentHookProtocol, Protocol):
    def __call__[C: Component](self, comp: C) -> None: ...


restore_prepare_hook = ComponentHook[RestorePrepareProtocol]("restore_prepare_hook")


class BackupMetadata(Struct):
    filename: str
    timestamp: datetime
    size: int


def parse_pg_dump_version(output: str) -> Version:
    """Parse output of pg_dump --version to Version"""
    output = output.strip()
    output = re.sub(r"\(.*?\)", " ", output)
    m = re.search(r"\d+(?:\.\d+){1,}", output)
    if m is None:
        raise ValueError("Unrecognized pg_dump output!")
    return Version(m.group(0))


def pg_connection_options() -> tuple[Iterable[str], str]:
    from nextgisweb.core import CoreComponent

    con_args = CoreComponent.current()._db_connection_args()
    return [
        "--host",
        con_args["host"],
        "--port",
        str(con_args["port"]),
        "--username",
        con_args["username"],
        "--dbname",
        con_args["database"],
    ], con_args["password"]


def backup(dst: Path) -> None:
    # TRANSACTION AND CONNECTION

    con = DBSession.connection()
    con.execute(sa.text("SET TRANSACTION ISOLATION LEVEL SERIALIZABLE READ ONLY DEFERRABLE"))

    (snapshot,) = con.execute(sa.text("SELECT pg_export_snapshot()")).one()
    logger.debug("Using postgres snapshot: %s", snapshot)

    # CONFIGURATION

    config = BackupConfiguration()
    for comp, func in backup_configure_hook:
        func(comp, config)

    # POSTGES DUMP

    logger.info("Dumping PostgreSQL database...")

    pg_dir = dst / "postgres"
    pg_dir.mkdir()

    pgd_version = parse_pg_dump_version(
        check_output(["/usr/bin/pg_dump", "--version"]).decode("utf-8")
    )
    if pgd_version < Version("10.0"):
        raise RuntimeError("pg_dump 10.0+ required")

    exc_opt = list()
    if len(config._exclude_table) > 0:
        logger.debug("Excluding tables entirely: %s", ", ".join(config._exclude_table))
        exc_opt += ["--exclude-table={}".format(i) for i in config._exclude_table]

    if len(config._exclude_table_data) > 0:
        logger.debug("Excluding tables data: %s", ", ".join(config._exclude_table_data))
        exc_opt += ["--exclude-table-data={}".format(i) for i in config._exclude_table_data]

    pg_copt, pg_pass = pg_connection_options()
    pg_dump_cmd = [
        "/usr/bin/pg_dump",
        "--format=directory",
        "--compress=0",
        "--file={}".format(pg_dir),
        "--snapshot={}".format(snapshot),
        *exc_opt,
        *pg_copt,
    ]
    logger.debug("Running pg_dump: %s", shlex_join(pg_dump_cmd))
    check_call(pg_dump_cmd, env=dict(PGPASSWORD=pg_pass))

    pg_listing = check_output(["/usr/bin/pg_restore", "--list", pg_dir]).decode("utf-8")

    @cache
    def get_cls_relname(oid: int) -> str:
        (relname,) = con.execute(
            sa.text("SELECT relname FROM pg_catalog.pg_class WHERE oid = :oid"),
            dict(oid=oid),
        ).one()
        return relname

    def get_namespace(oid: int) -> str:
        (nspname,) = con.execute(
            sa.text("SELECT nspname FROM pg_catalog.pg_namespace WHERE oid = :oid"),
            dict(oid=oid),
        ).one()
        return nspname

    pg_toc_regexp = re.compile(r"(\d+)\;\s+(\d+)\s+(\d+)\s+(.*)")

    restore_list = []
    skip_prev = False
    for line in pg_listing.split("\n"):
        if line == "" or line.startswith(";"):
            restore_list.append(line)
            continue

        skip = False
        if (m := pg_toc_regexp.match(line)) is not None:
            did, cls_oid, obj_oid, rest = m.groups()
            cls_oid = int(cls_oid)
            obj_oid = int(obj_oid)

            cls_relname = get_cls_relname(cls_oid) if cls_oid != 0 else None

            # Skip restoration: database, extensions, public schema
            # and comments for skipped comments
            skip = (
                cls_relname in ("pg_database", "pg_extension")
                or (cls_relname == "pg_namespace" and get_namespace(obj_oid) == "public")
                or (skip_prev and rest.startswith("COMMENT "))
            )

            restore_list.append((";" if skip else "") + line)
            if skip:
                logger.debug("Skipping entry: %s", line)
        else:
            logger.warning("Unexpected line in TOC: %s", line)

        skip_prev = skip

    logger.debug("%d entries in restore list", len(restore_list))

    pg_restore_list = os.path.join(pg_dir, "restore")
    with open(pg_restore_list, "w") as fd:
        fd.write("\n".join(restore_list))

    # CUSTOM COMPONENT DATA

    logger.info("Dumping components data...")

    comp_root = dst / "component"
    comp_root.mkdir()

    ocount: int = 0
    cidents: list[str] = []

    for comp, func in backup_objects_hook:
        comp_dir = comp_root / comp.identity
        comp_dir.mkdir()

        idx_fn = comp_dir / "$index"
        with IndexFile(idx_fn).writer() as idx_write:
            for seq, itm in enumerate(func(comp), start=1):
                assert isinstance(itm, BackupBase)
                record = IndexRecord(id=seq, identity=itm.identity, payload=itm.payload)
                if itm.blob:
                    bin_fn = comp_dir / "{:08d}".format(seq)
                    with bin_fn.open("wb") as fd:
                        itm.backup(fd)

                idx_write(record)
                ocount += 1

        # Remove empty component directory
        if not any(comp_dir.iterdir()):
            comp_dir.rmdir()
        else:
            cidents.append(comp.identity)

    logger.info("%d objects backed up from components: %s", ocount, ", ".join(cidents))


def restore(src: Path) -> None:
    for comp, func in restore_prepare_hook:
        func(comp)

    metadata = env.metadata()
    with transaction.manager:
        metadata.drop_all(DBSession().connection())
        mark_changed(DBSession())

    # POSTGRES RESTORE
    logger.info("Restoring PostgreSQL dump...")

    pg_dir = src / "postgres"
    pg_restore_list = pg_dir / "restore"

    pg_copt, pg_pass = pg_connection_options()
    pg_restore_cmd = [
        "/usr/bin/pg_restore",
        "--clean",
        "--if-exists",
        "--no-owner",
        "--no-privileges",
        "--exit-on-error",
        "--use-list={}".format(pg_restore_list),
        *pg_copt,
        str(pg_dir),
    ]
    logger.debug("Running pg_restore: %s", shlex_join(pg_restore_cmd))
    check_call(pg_restore_cmd, env=dict(PGPASSWORD=pg_pass))

    # CUSTOM COMPONENT DATA
    logger.info("Restoring component data...")

    comp_root = src / "component"
    ocount: int = 0
    cidents: list[str] = []
    with transaction.manager:
        for comp_dir in comp_root.iterdir():
            idx_fn = comp_dir / "$index"
            if not idx_fn.exists():
                continue
            cidents.append(comp_dir.name)
            with IndexFile(idx_fn).reader() as read:
                for record in read:
                    itm = BackupBase.registry[record.identity](record.payload)
                    if itm.blob:
                        bin_fn = comp_dir / "{:08d}".format(record.id)
                        with bin_fn.open("rb") as fd:
                            itm.restore(fd)
                    ocount += 1

        logger.info("%d objects restored from components: %s", ocount, ", ".join(cidents))
        mark_changed(DBSession())
