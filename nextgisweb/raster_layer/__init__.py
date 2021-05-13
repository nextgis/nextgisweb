# -*- coding: utf-8 -*-
from __future__ import division, absolute_import, print_function, unicode_literals

import os

from ..component import Component
from ..core import (
    storage_stat_dimension,
    KindOfData,
)

from .model import Base, RasterLayer
from .gdaldriver import GDAL_DRIVER_NAME_2_EXPORT_FORMATS
from .util import _
from . import command  # NOQA

__all__ = ['RasterLayerComponent', 'RasterLayer']


class RasterLayerData(KindOfData):
    identity = 'raster_layer_data'
    display_name = _("Raster layer data")


class RasterLayerComponent(Component):
    identity = 'raster_layer'
    metadata = Base.metadata

    def initialize(self):
        self.env.core.mksdir(self)
        self.wdir = self.env.core.gtsdir(self)

    def setup_pyramid(self, config):
        from . import view, api # NOQA
        view.setup_pyramid(self, config)
        api.setup_pyramid(self, config)

    def client_settings(self, request):
        return dict(
            export_formats=GDAL_DRIVER_NAME_2_EXPORT_FORMATS,
        )

    def workdir_filename(self, fobj, makedirs=False):
        return self.env.file_storage.workdir_filename(self, fobj, makedirs)

    def maintenance(self):
        super(RasterLayerComponent, self).maintenance()

        self.logger.info("Building missing raster overviews")
        for resource in RasterLayer.query():
            resource.build_overview(missing_only=True)

        # TODO: Cleanup raster_layer directory same as file_storage

    def estimate_storage(self, timestamp):

        def file_size(fn):
            stat = os.stat(fn)
            return stat.st_size

        for resource in RasterLayer.query():
            fn = self.workdir_filename(resource.fileobj)

            # Size of source file with overviews
            size = file_size(fn) + file_size(fn + '.ovr')

            storage_stat_dimension.insert(dict(
                timestamp=timestamp,
                component=self.identity,
                kind_of_data=RasterLayerData.identity,
                resource_id=resource.id,
                value_data_volume=size
            )).execute()
