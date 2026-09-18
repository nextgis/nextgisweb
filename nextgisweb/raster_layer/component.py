import transaction
from sqlalchemy.sql import or_

from nextgisweb.env import Component, DBSession, require
from nextgisweb.lib.config import Option, SizeInBytes
from nextgisweb.lib.logging import logger

from nextgisweb.core import CoreComponent, maintenance_hook
from nextgisweb.file_storage.component import maintenance as file_storage_maintenance
from nextgisweb.file_upload import FileUploadComponent

from .kind_of_data import RasterLayerData
from .model import RasterBand, RasterLayer, RasterLayerMeta, estimate_raster_layer_data
from .util import band_color_interp
from .workdir import WorkdirMixin


class RasterLayerComponent(Component, WorkdirMixin):
    @require("file_upload")
    def initialize(self):
        core = self.env.component(CoreComponent)

        core.mksdir(self)
        self.wdir = core.gtsdir(self)
        self.cog_default = self.options["cog_default"]

        if "size_limit" not in self.options:
            file_upload = self.env.component(FileUploadComponent)
            self.size_limit = 2 * file_upload.options["max_size"]
        else:
            self.size_limit = self.options["size_limit"]

    def setup_pyramid(self, config):
        from . import api, view

        view.setup_pyramid(self, config)
        api.setup_pyramid(self, config)

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


@maintenance_hook(after=[file_storage_maintenance])
def maintenance(comp: RasterLayerComponent) -> None:
    comp.build_missing_overviews()
    comp.populate_missing_columns()
    comp.workdir_cleanup()
