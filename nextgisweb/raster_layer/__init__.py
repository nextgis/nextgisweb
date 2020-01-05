# -*- coding: utf-8 -*-
from __future__ import division, absolute_import, print_function, unicode_literals
import os
import os.path
from ..component import Component

from .model import Base, RasterLayer
from . import command  # NOQA

__all__ = ['RasterLayerComponent', 'RasterLayer']


class RasterLayerComponent(Component):
    identity = 'raster_layer'
    metadata = Base.metadata

    def initialize(self):
        self.env.core.mksdir(self)
        self.wdir = self.env.core.gtsdir(self)

    def setup_pyramid(self, config):
        from . import view # NOQA

    def workdir_filename(self, fobj, makedirs=False):
        levels = (fobj.uuid[0:2], fobj.uuid[2:4])
        dname = os.path.join(self.wdir, *levels)

        # Create folders if needed
        if not os.path.isdir(dname):
            os.makedirs(dname)

        fname = os.path.join(dname, fobj.uuid)
        oname = self.env.file_storage.filename(fobj, makedirs=makedirs)
        if not os.path.isfile(fname):
            os.symlink(oname, fname)

        return fname

    def maintenance(self):
        super(RasterLayerComponent, self).maintenance()

        self.logger.info("Building missing raster overviews")
        for resource in RasterLayer.query():
            resource.build_overview(missing_only=True)

        # TODO: Cleanup raster_layer directory same as file_storage
