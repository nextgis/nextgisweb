from ..component import Component, require

from .model import Base, Service, Layer

__all__ = ['Service', 'Layer', ]


class WMSServerComponent(Component):
    identity = 'wmsserver'
    metadata = Base.metadata

    @require('render', 'feature_layer')
    def setup_pyramid(self, config):
        from . import view
        view.setup_pyramid(self, config)
