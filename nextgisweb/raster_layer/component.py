import transaction
from sqlalchemy.sql import or_

from nextgisweb.env import Component, DBSession, gettext, require
from nextgisweb.lib.config import Option, SizeInBytes
from nextgisweb.lib.humanize import format_size
from nextgisweb.lib.logging import logger

from .kind_of_data import RasterLayerData
from .model import RasterBand, RasterLayer, RasterLayerMeta, estimate_raster_layer_data
from .util import band_color_interp
from .workdir import WorkdirMixin


class RasterLayerComponent(Component, WorkdirMixin):
    @require("file_upload")
    def initialize(self):
        self.env.core.mksdir(self)
        self.wdir = self.env.core.gtsdir(self)
        self.cog_default = self.options["cog_default"]

        if "size_limit" not in self.options:
            self.size_limit = 2 * self.env.file_upload.options["max_size"]
        else:
            self.size_limit = self.options["size_limit"]

    def setup_pyramid(self, config):
        from . import api, view

        view.setup_pyramid(self, config)
        api.setup_pyramid(self, config)

    @require("file_storage")
    def maintenance(self):
        super().maintenance()
        self.build_missing_overviews()
        self.populate_missing_columns()
        self.workdir_cleanup()

    def check_integrity(self):
        for layer in RasterLayer.query():
            if (err := layer._check_integrity()) is not None:
                yield f"{err} [{RasterLayer.cls_display_name} #{layer.id}]"

    def sys_info(self):
        if self.size_limit is not None:
            yield (gettext("Uncompressed raster size limit"), format_size(self.size_limit))

    def build_missing_overviews(self):
        logger.info("Building missing raster overviews...")
        for resource in RasterLayer.filter_by(cog=False):
            resource.build_overview(missing_only=True)

    def estimate_storage(self):
        for resource in RasterLayer.filter(RasterLayer.storage_id.is_(None)):
            size = estimate_raster_layer_data(resource)
            yield RasterLayerData, resource.id, size

    def populate_missing_columns(self):
        with transaction.manager:
            for resource in DBSession.query(RasterLayer).filter(
                or_(
                    RasterLayer.geo_transform.is_(None),
                    RasterLayer.meta.is_(None),
                )
            ):
                ds = resource.gdal_dataset()

                if resource.geo_transform is None:
                    resource.geo_transform = list(ds.GetGeoTransform())

                if resource.meta is None:
                    bands = []
                    for bidx in range(1, ds.RasterCount + 1):
                        band = ds.GetRasterBand(bidx)
                        minval, maxval = band.ComputeRasterMinMax(False)
                        bands.append(
                            RasterBand(
                                color_interp=band_color_interp(band),
                                no_data=band.GetNoDataValue(),
                                rat=band.GetDefaultRAT() is not None,
                                min=minval,
                                max=maxval,
                            )
                        )
                    resource.meta = RasterLayerMeta(bands=bands)

    option_annotations = (
        Option("cog_default", bool, default=True),
        Option(
            "size_limit",
            SizeInBytes,
            default=None,
            doc="Uncompressed raster size limit (by default equals 2x file upload max size)",
        ),
    )
