# -*- coding: utf-8 -*-
from __future__ import division, absolute_import, print_function, unicode_literals
import os
import os.path
from ..component import Component

from .model import Base, RasterLayer
from .gdaldriver import GDAL_DRIVER_NAME_2_EXPORT_FORMATS
from . import command  # NOQA

__all__ = ['RasterLayerComponent', 'RasterLayer']


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
        return self.env.core.workdir_filename(self, fobj, makedirs)

    def maintenance(self):
        super(RasterLayerComponent, self).maintenance()

        self.logger.info("Building missing raster overviews")
        for resource in RasterLayer.query():
            resource.build_overview(missing_only=True)

        # TODO: Cleanup raster_layer directory same as file_storage
