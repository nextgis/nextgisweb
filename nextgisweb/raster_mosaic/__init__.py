from .model import Base
from ..component import Component, require


class RasterMosaicComponent(Component):
    identity = 'raster_mosaic'
    metadata = Base.metadata

    @require('layer')
    def setup_pyramid(self, config):
        from . import api
        from . import view  # NOQA: F401
        api.setup_pyramid(self, config)

    def workdir_filename(self, fobj, makedirs=False):
        return self.env.file_storage.workdir_filename(self, fobj, makedirs)
