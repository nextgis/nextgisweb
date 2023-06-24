from nextgisweb.env import Component

from .model import Base


class WMSServerComponent(Component):
    identity = 'wmsserver'
    metadata = Base.metadata

    def setup_pyramid(self, config):
        from . import api, view
        api.setup_pyramid(self, config)
        view.setup_pyramid(self, config)
