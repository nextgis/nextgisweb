from nextgisweb.env import Component, require
from nextgisweb.lib.config import Option, SizeInBytes
from nextgisweb.lib.logging import logger

from .gdaldriver import GDAL_DRIVER_NAME_2_EXPORT_FORMATS
from .kind_of_data import RasterLayerData
from .model import RasterLayer, estimate_raster_layer_data
from .workdir import WorkdirMixin


class RasterLayerComponent(Component, WorkdirMixin):
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

    @require("file_storage")
    def maintenance(self):
        super().maintenance()
        self.build_missing_overviews()
        self.workdir_cleanup()

    def build_missing_overviews(self):
        logger.info("Building missing raster overviews...")
        for resource in RasterLayer.filter_by(cog=False):
            resource.build_overview(missing_only=True)

    def estimate_storage(self):
        for resource in RasterLayer.query():
            size = estimate_raster_layer_data(resource)
            yield RasterLayerData, resource.id, size

    option_annotations = (
        Option("cog_enabled", bool, default=True),
        Option("size_limit", SizeInBytes, default=None),
    )
