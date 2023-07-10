import os
from datetime import datetime, timedelta
from shutil import rmtree

from ulid import ULID

from nextgisweb.env import Component
from nextgisweb.lib.config import Option, SizeInBytes
from nextgisweb.lib.logging import logger

from .util import stat_dir

date_format = r'%Y-%m-%d'


class FileUploadComponent(Component):

    def initialize(self):
        self.path = self.options['path'] or self.env.core.gtsdir(self)
        self.max_size = self.options['max_size']

        tus_options = self.options.with_prefix('tus')
        self.tus_enabled = tus_options['enabled']
        self.tus_chunk_size_default = tus_options['chunk_size.default']
        self.tus_chunk_size_minimum = tus_options['chunk_size.minimum']

    def initialize_db(self):
        if 'path' not in self.options:
            self.env.core.mksdir(self)

        # FIXME: Force migration
        from importlib.machinery import SourceFileLoader
        from types import SimpleNamespace
        mod = SourceFileLoader('', os.path.join(
            os.path.split(__file__)[0],
            'migration', '3803b726-cleanup-prev-format.py')
        ).load_module()
        mod.forward(SimpleNamespace(env=self.env))

    def setup_pyramid(self, config):
        from . import api, view
        view.setup_pyramid(self, config)
        api.setup_pyramid(self, config)

    def fileid(self):
        """ Returns new file identifier """
        return ULID().hex

    def get_filename(self, fileid, makedirs=False):
        """ Returns filename (data and metadata), where
        uploaded file is stored with set fileid.

        With makedirs == True also create folders.
        Useful when filename are needed for writing. """

        ulid = ULID.from_hex(fileid)
        levels = (ulid.datetime.strftime(date_format), fileid[-2:], fileid[-4:-2])
        level_path = os.path.join(self.path, *levels)

        # Create folders if needed
        if makedirs and not os.path.isdir(level_path):
            os.makedirs(level_path)

        base_filename = os.path.join(level_path, fileid)
        return (base_filename + '.data', base_filename + '.meta')

    def maintenance(self):
        super().maintenance()
        self.cleanup()

    def cleanup(self):
        if not os.path.exists(self.path):
            logger.info("Upload directory not exists.")
            return

        logger.info("Cleaning up file uploads...")

        deleted_files = deleted_bytes = 0
        kept_files = kept_bytes = 0

        date_keep = datetime.utcnow().date() - timedelta(days=1)

        for dirpath in os.listdir(self.path):
            try:
                date_dir = datetime.strptime(dirpath, date_format).date()
            except ValueError:
                logger.warning(f"Unknown folder {dirpath}, skipping...")
                continue
            abspath = os.path.join(self.path, dirpath)
            files, bytes_ = stat_dir(abspath)

            if date_dir < date_keep:
                rmtree(abspath)
                deleted_files += files
                deleted_bytes += bytes_
            else:
                kept_files += files
                kept_bytes += bytes_

        logger.info(
            "Deleted: %d files (%d bytes)",
            deleted_files, deleted_bytes)

        logger.info(
            "Preserved: %d files (%d bytes)",
            kept_files, kept_bytes)

    def client_settings(self, request):
        return dict(
            max_size=self.max_size,
            tus=dict(
                enabled=self.tus_enabled,
                chunk_size=dict(
                    default=self.tus_chunk_size_default,
                    minimum=self.tus_chunk_size_minimum,
                )
            )
        )

    option_annotations = (
        Option('path', default=None),
        Option('max_size', SizeInBytes, default=8 * 2**30),
        Option('tus.enabled', bool, default=True),
        Option('tus.chunk_size.default', SizeInBytes, default=16 * 2**20),
        Option('tus.chunk_size.minimum', SizeInBytes, default=1 * 2**20),
    )
