import os
from pathlib import Path

from nextgisweb.env import Component, require
from nextgisweb.lib.config import Option, SizeInBytes
from nextgisweb.lib.logging import logger

from .gdaldriver import GDAL_DRIVER_NAME_2_EXPORT_FORMATS
from .kind_of_data import RasterLayerData
from .model import RasterLayer, estimate_raster_layer_data


class RasterLayerComponent(Component):
    def initialize(self):
        self.env.core.mksdir(self)
        self.wdir = self.env.core.gtsdir(self)
        self.cog_enabled = self.options["cog_enabled"]

    def setup_pyramid(self, config):
        from . import api, view

        view.setup_pyramid(self, config)
        api.setup_pyramid(self, config)

    def client_settings(self, request):
        return dict(
            export_formats=GDAL_DRIVER_NAME_2_EXPORT_FORMATS,
            cog_enabled=self.cog_enabled,
        )

    def workdir_filename(self, fobj, makedirs=False):
        return self.env.file_storage.workdir_filename(self, fobj, makedirs)

    @require("file_storage")
    def maintenance(self):
        super().maintenance()
        self.build_missing_overviews()
        self.cleanup()

    def build_missing_overviews(self):
        logger.info("Building missing raster overviews...")
        for resource in RasterLayer.filter_by(cog=False):
            resource.build_overview(missing_only=True)

    def cleanup(self):
        logger.info("Cleaning up raster layer storage...")

        deleted_symlinks = deleted_ovr = deleted_bytes = 0
        kept_symlinks = kept_ovr = kept_bytes = 0

        for dirpath, dirnames, filenames in os.walk(self.wdir, topdown=False):
            relist = False
            overviews = []

            for fn in filenames:
                fullfn = Path(dirpath) / fn
                if fullfn.suffix == ".ovr":
                    overviews.append(fullfn)
                elif fullfn.is_symlink():
                    size = fullfn.lstat().st_size
                    if fullfn.exists():
                        kept_symlinks += 1
                        kept_bytes += size
                    else:
                        fullfn.unlink()
                        relist = True
                        deleted_symlinks += 1
                        deleted_bytes += size

            for fullfn in overviews:
                size = fullfn.stat().st_size
                if fullfn.with_suffix("").exists():
                    kept_ovr += 1
                    kept_bytes += size
                else:
                    fullfn.unlink()
                    relist = True
                    deleted_ovr += 1
                    deleted_bytes += size

            if dirpath != os.path.normpath(self.wdir) and (
                (not relist and len(filenames) == 0 and len(dirnames) == 0)
                or len(os.listdir(dirpath)) == 0
            ):
                os.rmdir(dirpath)

        logger.info(
            "Deleted: %d symlinks, %d raster overviews (%d bytes)",
            deleted_symlinks,
            deleted_ovr,
            deleted_bytes,
        )

        logger.info(
            "Preserved: %d symlinks, %d raster overviews (%d bytes)",
            kept_symlinks,
            kept_ovr,
            kept_bytes,
        )

    def estimate_storage(self):
        for resource in RasterLayer.query():
            size = estimate_raster_layer_data(resource)
            yield RasterLayerData, resource.id, size

    option_annotations = (
        Option("cog_enabled", bool, default=True),
        Option("size_limit", SizeInBytes, default=None),
    )
