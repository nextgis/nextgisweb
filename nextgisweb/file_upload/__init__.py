# -*- coding: utf-8 -*-
from __future__ import division, absolute_import, print_function, unicode_literals
import os
import os.path
import uuid
from datetime import datetime, timedelta

from ..lib.config import Option
from ..component import Component
from . import command  # NOQA

__all__ = ["FileUploadComponent", ]


class FileUploadComponent(Component):
    identity = 'file_upload'

    def initialize(self):
        self.path = self.options['path'] or self.env.core.gtsdir(self)

    def initialize_db(self):
        if 'path' not in self.options:
            self.env.core.mksdir(self)

    def setup_pyramid(self, config):
        from . import view, api
        view.setup_pyramid(self, config)
        api.setup_pyramid(self, config)

    def fileid(self):
        """ Returns new file identifier """
        return str(uuid.uuid4())

    def get_filename(self, fileid, makedirs=False):
        """ Returns filename (data and metadata), where
        uploaded file is stored with set fileid.

        With makedirs == True also create folders.
        Useful when filename are needed for writing. """

        # Separate in two folder levels by first id characters
        levels = (fileid[0:2], fileid[2:4])
        level_path = os.path.join(self.path, *levels)

        # Create folders if needed
        if makedirs and not os.path.isdir(level_path):
            os.makedirs(level_path)

        base_filename = os.path.join(level_path, fileid)
        return (base_filename + '.data', base_filename + '.meta')

    def maintenance(self):
        super(FileUploadComponent, self).maintenance()
        self.cleanup()

    def cleanup(self):
        self.logger.info("Cleaning up file uploads...")
        path = self.path

        deleted_files, deleted_dirs, deleted_bytes = 0, 0, 0
        kept_files, kept_dirs, kept_bytes = 0, 0, 0

        cutstamp = datetime.now() - timedelta(days=1)

        for (dirpath, dirnames, filenames) in os.walk(path, topdown=False):
            relist = False

            for fn in filenames:
                if not fn.endswith('.meta'):
                    continue

                metaname = os.path.join(dirpath, fn)
                dataname = metaname[:-5] + '.data'
                metastat = os.stat(metaname)
                datastat = os.stat(dataname)
                metatime = datetime.fromtimestamp(metastat.st_mtime)
                datatime = datetime.fromtimestamp(datastat.st_mtime)

                if (metatime < cutstamp) and (datatime < cutstamp):
                    os.remove(metaname)
                    os.remove(dataname)
                    relist = True
                    deleted_files += 2
                    deleted_bytes += metastat.st_size + datastat.st_size
                else:
                    kept_files += 2
                    kept_bytes += metastat.st_size + datastat.st_size

            if (
                (not relist and len(filenames) == 0 and len(dirnames) == 0)
                or len(os.listdir(dirpath)) == 0  # NOQA: W503
            ):
                os.rmdir(dirpath)
                deleted_dirs += 1
            else:
                kept_dirs += 1

        self.logger.info(
            "Deleted: %d files, %d directories, %d bytes",
            deleted_files, deleted_dirs, deleted_bytes)

        self.logger.info(
            "Preserved: %d files, %d directories, %d bytes",
            kept_files, kept_dirs, kept_bytes)

    option_annotations = (
        Option('path', default=None),
    )
