from nextgisweb.env import Component

from nextgisweb.raster_layer.workdir import WorkdirMixin


class RasterMosaicComponent(Component, WorkdirMixin):
    def setup_pyramid(self, config):
        from . import api, view  # noqa: F401

        api.setup_pyramid(self, config)
