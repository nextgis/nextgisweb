import os
from datetime import datetime, timedelta
from shutil import rmtree
from warnings import warn

from nextgisweb.env import Component
from nextgisweb.lib.config import Option, SizeInBytes
from nextgisweb.lib.logging import logger

from .util import stat_dir

date_format = r"%Y-%m-%d"


class FileUploadComponent(Component):
    def initialize(self):
        self.path = self.options["path"] or self.env.core.gtsdir(self)
        self.max_size = self.options["max_size"]
        self.chunk_size = self.options["chunk_size"]

    def initialize_db(self):
        if "path" not in self.options:
            self.env.core.mksdir(self)

        # FIXME: Force migration
        from importlib.machinery import SourceFileLoader
        from types import SimpleNamespace

        mod = SourceFileLoader(
            "",
            os.path.join(
                os.path.split(__file__)[0],
                "migration",
                "3803b726-cleanup-prev-format.py",
            ),
        ).load_module()
        mod.forward(SimpleNamespace(env=self.env))

    def setup_pyramid(self, config):
        from . import api, view

        view.setup_pyramid(self, config)
        api.setup_pyramid(self, config)

    def get_filename(self, fileid, makedirs=False):
        from .model import _filenames

        warn(
            "FileUploadComponent.get_filename is deprecated since 4.7.0.dev5. "
            "Use FileUpoad.data_path and FileUpload.meta_path instead.",
            DeprecationWarning,
            stacklevel=2,
        )

        return tuple(str(p) for p in _filenames(fileid, makedirs=makedirs))

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

        logger.info("Deleted: %d files (%d bytes)", deleted_files, deleted_bytes)
        logger.info("Preserved: %d files (%d bytes)", kept_files, kept_bytes)

    def client_settings(self, request):
        return dict(
            maxSize=self.max_size,
            chunkSize=self.chunk_size,
        )

    # fmt: off
    option_annotations = (
        Option("path", default=None),
        Option("max_size", SizeInBytes, default=8 * 2**30),
        Option("chunk_size", SizeInBytes, default=16 * 2**20),
    )
    # fmt: on
