from .model import Base
from ..component import Component


class RasterMosaicComponent(Component):
    identity = 'raster_mosaic'
    metadata = Base.metadata

    def setup_pyramid(self, config):
        from . import api, view
        api.setup_pyramid(self, config)

    def workdir_filename(self, fobj, makedirs=False):
        return self.env.file_storage.workdir_filename(self, fobj, makedirs)
