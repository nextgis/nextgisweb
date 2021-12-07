from ..component import Component

from .model import Base, Service, Layer

__all__ = ['Service', 'Layer', ]


class WMSServerComponent(Component):
    identity = 'wmsserver'
    metadata = Base.metadata

    def setup_pyramid(self, config):
        from . import api, view
        api.setup_pyramid(self, config)
        view.setup_pyramid(self, config)
