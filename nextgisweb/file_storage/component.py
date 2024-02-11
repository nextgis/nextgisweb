import os
import os.path
from datetime import datetime as dt
from datetime import timedelta
from operator import itemgetter
from shutil import copyfileobj

import sqlalchemy as sa
import transaction

from nextgisweb.env import Component, DBSession
from nextgisweb.lib.config import Option
from nextgisweb.lib.logging import logger
from nextgisweb.lib.saext import query_unreferenced

from nextgisweb.core import BackupBase

from .model import FileObj

BUF_SIZE = 1024 * 1024


class FileObjBackup(BackupBase):
    identity = "fileobj"
    plget = itemgetter("component", "uuid")

    def blob(self):
        return True

    def backup(self, dst):
        with open(self.component.filename(self.plget(self.payload)), "rb") as fd:
            copyfileobj(fd, dst, length=BUF_SIZE)

    def restore(self, src):
        fn = self.component.filename(self.plget(self.payload), makedirs=True)
        if os.path.isfile(fn):
            logger.debug(
                "Skipping restoration of fileobj %s: file already exists!", self.payload["uuid"]
            )
        else:
            with open(fn, "wb") as fd:
                copyfileobj(src, fd, length=BUF_SIZE)


class FileStorageComponent(Component):
    def initialize(self):
        self.path = self.options["path"] or self.env.core.gtsdir(self)

    def initialize_db(self):
        if "path" not in self.options:
            self.env.core.mksdir(self)

    def backup_objects(self):
        for fileobj in FileObj.query().order_by(FileObj.component, FileObj.uuid):
            yield FileObjBackup(dict(component=fileobj.component, uuid=fileobj.uuid))

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

    def query_stat(self):
        total_count = 0
        total_size = 0
        total_max = 0
        component = dict()
        for cid, count, csize, cmax in DBSession.query(
            FileObj.component,
            sa.func.count(FileObj.id),
            sa.func.sum(FileObj.size).cast(sa.BigInteger),
            sa.func.max(FileObj.size).cast(sa.BigInteger),
        ).group_by(FileObj.component):
            total_count += count
            total_size += csize
            total_max = max(total_max, cmax)
            component[cid] = dict(count=count, size=csize, max=cmax)

        return dict(
            dict(count=total_count, size=total_size, max=total_max),
            component=component,
        )

    def maintenance(self):
        super().maintenance()
        self.cleanup(dry_run=False)

    def cleanup(self, *, dry_run, unreferenced=False, orphaned=True):
        logger.info("Cleaning up file storage...")

        if unreferenced:
            self.cleanup_unreferenced(dry_run=dry_run)
        if orphaned:
            self.cleanup_orphaned(dry_run=dry_run)

    def cleanup_unreferenced(self, *, dry_run):
        query = query_unreferenced(FileObj, FileObj.id)

        if dry_run:
            records = query.count()
        else:
            with transaction.manager:
                records = query.delete(synchronize_session=False)

        logger.info("%d unreferenced file records found", records)

    def cleanup_orphaned(self, *, dry_run):
        deleted_files = deleted_bytes = 0
        kept_files = kept_bytes = 0

        delta = self.options["cleanup_keep_interval"]

        for dirpath, dirnames, filenames in os.walk(self.path, topdown=False):
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
                and dirpath != os.path.normpath(self.path)
                and (
                    (not relist and len(filenames) == 0 and len(dirnames) == 0)
                    or len(os.listdir(dirpath)) == 0
                )
            ):
                os.rmdir(dirpath)

        logger.info("%d orphaned files found (%d bytes)", deleted_files, deleted_bytes)
        logger.info("%d files remain (%d bytes)", kept_files, kept_bytes)

    def check_integrity(self):
        for fileobj in FileObj.query():
            filepath = self.filename(fileobj, makedirs=False)
            if not os.path.isfile(filepath):
                yield f"File '{filepath}' not found."

    # fmt: off
    option_annotations = (
        Option("path", default=None),
        Option("cleanup_keep_interval", timedelta, default=timedelta(days=2)),
    )
    # fmt: on
