import os
import os.path
import re
from datetime import datetime as dt
from datetime import timedelta, timezone
from pathlib import Path

import transaction

from nextgisweb.env import Component
from nextgisweb.lib.config import Option
from nextgisweb.lib.datetime import utcnow_naive
from nextgisweb.lib.logging import logger
from nextgisweb.lib.saext import query_unreferenced

from nextgisweb.core import CoreComponent, maintenance_hook


class FileStorageComponent(Component):
    def initialize(self):
        self.path = self.options["path"] or self.env.component(CoreComponent).gtsdir(self)

    def initialize_db(self):
        if "path" not in self.options:
            self.env.component(CoreComponent).mksdir(self)

    def fileobj(self, component):
        from .model import FileObj

        obj = FileObj(component=component)
        return obj

    def filename(self, fileobj, makedirs=False):
        from .model import FileObj

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

    def cleanup(self, *, dry_run, unreferenced=True, orphaned=True):
        logger.info("Cleaning up file storage...")

        if unreferenced:
            self.cleanup_unreferenced(dry_run=dry_run)
        if orphaned:
            self.cleanup_orphaned(dry_run=dry_run)

    def cleanup_unreferenced(self, *, dry_run):
        from .model import FileObj

        query = query_unreferenced(FileObj, FileObj.id)

        if dry_run:
            records = query.count()
        else:
            with transaction.manager:
                records = query.delete(synchronize_session=False)

        logger.info("%d unreferenced file records found", records)

    def cleanup_orphaned(self, *, dry_run):
        from .model import FileObj

        deleted_files = deleted_bytes = 0
        kept_files = kept_bytes = 0

        delta = self.options["cleanup_keep_interval"]

        filename_re = re.compile(r"[0-9a-f]{32}")
        for dirpath, dirnames, filenames in os.walk(self.path, topdown=False):
            relist = False

            for fn in filenames:
                fullfn = os.path.join(dirpath, fn)
                if not filename_re.fullmatch(fn):
                    relfn = Path(fullfn).relative_to(self.path)
                    logger.error("Unexpected file in storage: %s", str(relfn))
                    continue

                obj = FileObj.filter_by(uuid=fn).first()
                stat = os.stat(fullfn)

                if obj is None and (
                    utcnow_naive()
                    - dt.fromtimestamp(stat.st_ctime, tz=timezone.utc).replace(tzinfo=None)
                    > delta
                ):
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

    # fmt: off
    option_annotations = (
        Option("path", default=None),
        Option("cleanup_keep_interval", timedelta, default=timedelta(days=2)),
    )
    # fmt: on


@maintenance_hook()
def maintenance(comp: FileStorageComponent) -> None:
    comp.cleanup(dry_run=False)
