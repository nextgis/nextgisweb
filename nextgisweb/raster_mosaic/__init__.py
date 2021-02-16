# -*- coding: utf-8 -*-
from __future__ import division, absolute_import, print_function, unicode_literals

from .model import Base
from ..component import Component


class RasterMosaicComponent(Component):
    identity = 'raster_mosaic'
    metadata = Base.metadata

    def setup_pyramid(self, config):
        from . import api, view
        api.setup_pyramid(self, config)

    def workdir_filename(self, fobj, makedirs=False):
        return self.env.core.workdir_filename(self, fobj, makedirs)
