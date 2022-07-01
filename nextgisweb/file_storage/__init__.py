import os
import os.path
from collections import OrderedDict, defaultdict
from datetime import datetime as dt, timedelta
from shutil import copyfileobj
from operator import itemgetter

import transaction
from sqlalchemy import sql, text, exists

from ..lib.config import Option
from ..lib.logging import logger
from ..component import Component
from ..core import BackupBase
from ..models import DBSession

from .models import Base, FileObj
from . import command  # NOQA

__all__ = ['FileStorageComponent', 'FileObj']

BUF_SIZE = 1024 * 1024


@BackupBase.registry.register
class FileObjBackup(BackupBase):
    identity = 'fileobj'
    plget = itemgetter('component', 'uuid')

    def blob(self):
        return True

    def backup(self, dst):
        with open(self.component.filename(self.plget(self.payload)), 'rb') as fd:
            copyfileobj(fd, dst, length=BUF_SIZE)

    def restore(self, src):
        fn = self.component.filename(self.plget(self.payload), makedirs=True)
        if os.path.isfile(fn):
            logger.debug(
                "Skipping restoration of fileobj %s: file already exists!",
                self.payload['uuid'])
        else:
            with open(fn, 'wb') as fd:
                copyfileobj(src, fd, length=BUF_SIZE)


class FileStorageComponent(Component):
    identity = 'file_storage'
    metadata = Base.metadata

    def initialize(self):
        self.path = self.options['path'] or self.env.core.gtsdir(self)

    def initialize_db(self):
        if 'path' not in self.options:
            self.env.core.mksdir(self)

    def backup_objects(self):
        for fileobj in FileObj.query().order_by(FileObj.component, FileObj.uuid):
            yield FileObjBackup(OrderedDict(
                component=fileobj.component,
                uuid=fileobj.uuid))

    def fileobj(self, component):
        obj = FileObj(component=component)
        return obj

    def filename(self, fileobj, makedirs=False):
        if isinstance(fileobj, FileObj):
            component = fileobj.component
            uuid = fileobj.uuid
        else:
            component, uuid = fileobj

        # Separate in two folder levels by first id characters
        levels = (uuid[0:2], uuid[2:4])
        path = os.path.join(self.path, component, *levels)

        # Create folders if needed
        if makedirs and not os.path.isdir(path):
            os.makedirs(path)

        return os.path.join(path, uuid)

    def workdir_filename(self, comp, fobj, makedirs=False):
        levels = (fobj.uuid[0:2], fobj.uuid[2:4])
        dname = os.path.join(self.env.core.gtsdir(comp), *levels)

        # Create folders if needed
        if not os.path.isdir(dname):
            os.makedirs(dname)

        fname = os.path.join(dname, fobj.uuid)
        oname = self.env.file_storage.filename(fobj, makedirs=makedirs)
        if not os.path.isfile(fname):
            src = os.path.relpath(oname, os.path.dirname(fname))
            os.symlink(src, fname)

        return fname

    def query_stat(self):
        # Traverse all objects in file storage and calculate total
        # and per component size in filesystem

        def itm():
            return OrderedDict(size=0, count=0)

        result = OrderedDict(
            total=itm(), component=defaultdict(itm))

        def add_item(itm, size):
            itm['size'] += size
            itm['count'] += 1

        for fileobj in FileObj.query():
            statres = os.stat(self.filename(fileobj))
            add_item(result['total'], statres.st_size)
            add_item(result['component'][fileobj.component], statres.st_size)

        return result

    def maintenance(self):
        super().maintenance()
        self.cleanup(dry_run=False)

    def cleanup(self, *, dry_run, unreferenced=False, orphaned=True):
        logger.info('Cleaning up file storage...')

        if unreferenced:
            self.cleanup_unreferenced(dry_run=dry_run)
        if orphaned:
            self.cleanup_orphaned(dry_run=dry_run)

    def cleanup_unreferenced(self, *, dry_run):
        id_min, id_max = DBSession.query(
            sql.func.min(FileObj.id), sql.func.max(FileObj.id)).first()
        if id_min is None:
            logger.info("fileobj is empty!")
            return

        schema = FileObj.metadata.schema

        db_set = set()
        for row in DBSession.execute(text("""
            SELECT kcu.table_schema, kcu.table_name, kcu.column_name
            FROM information_schema.constraint_column_usage ccu
            INNER JOIN information_schema.table_constraints tc ON
                tc.constraint_name = ccu.constraint_name
                AND tc.constraint_type = 'FOREIGN KEY'
            INNER JOIN information_schema.key_column_usage kcu ON
                kcu.constraint_name = ccu.constraint_name
                AND kcu.table_schema = tc.table_schema
                AND kcu.table_name = tc.table_name
            WHERE
                ccu.table_schema = :schema
                AND ccu.table_name = :table
                AND ccu.column_name = :column
        """), dict(
            schema=schema if schema is not None else 'public',
            table=FileObj.__tablename__,
            column=FileObj.id.name
        )):
            db_set.add(row)

        sa_set = set()
        metadata = self.env.metadata()
        for table in metadata.tables.values():
            for fk in table.foreign_keys:
                if (
                    fk.column.table.name == FileObj.__tablename__
                    and fk.column.table.schema == schema
                    and fk.column.name == FileObj.id.name
                ):
                    sa_set.add((
                        table.schema if table.schema is not None else 'public',
                        table.name, fk.parent.name))

        if sa_set != db_set:
            raise RuntimeError(
                "FileObj DB and SQLAlchemy references mismatch: "
                "{} != {}".format(db_set, sa_set))

        q = DBSession.query(FileObj)
        for schema, table, column in db_set:
            c = sql.column(column)
            sql.table(table, c, schema=schema)  # Bind column to table
            q = q.filter(~exists().where(FileObj.id == c))

        if dry_run:
            records = q.count()
        else:
            with transaction.manager:
                records = q.delete(synchronize_session=False)

        logger.info("%d unreferenced file records found", records)

    def cleanup_orphaned(self, *, dry_run):
        deleted_files = deleted_bytes = 0
        kept_files = kept_bytes = 0

        delta = self.options['cleanup_keep_interval']

        for (dirpath, dirnames, filenames) in os.walk(self.path, topdown=False):
            relist = False

            for fn in filenames:
                obj = FileObj.filter_by(uuid=fn).first()
                fullfn = os.path.join(dirpath, fn)
                stat = os.stat(fullfn)

                if obj is None and (dt.utcnow() - dt.utcfromtimestamp(stat.st_ctime) > delta):
                    if not dry_run:
                        os.remove(fullfn)
                        relist = True
                    deleted_files += 1
                    deleted_bytes += stat.st_size
                else:
                    kept_files += 1
                    kept_bytes += stat.st_size

            if (
                not dry_run
                and (
                    (not relist and len(filenames) == 0 and len(dirnames) == 0)
                    or len(os.listdir(dirpath)) == 0
                )
            ):
                os.rmdir(dirpath)

        logger.info(
            "%d orphaned files found (%d bytes)",
            deleted_files, deleted_bytes)

        logger.info(
            "%d files remain (%d bytes)",
            kept_files, kept_bytes)

    option_annotations = (
        Option('path', default=None),
        Option('cleanup_keep_interval', timedelta, default=timedelta(days=2)),
    )
