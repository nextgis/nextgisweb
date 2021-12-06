from ..component import Component, require

from .model import Base, Service, Layer
from .wfs_handler import VERSION_DEFAULT, VERSION_SUPPORTED

__all__ = ['Service', 'Layer', 'VERSION_DEFAULT', 'VERSION_SUPPORTED']


class WFSServerComponent(Component):
    identity = 'wfsserver'
    metadata = Base.metadata

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.force_schema_validation = False

    @require('feature_layer', 'layer')
    def setup_pyramid(self, config):
        from . import api, view
        api.setup_pyramid(self, config)
        view.setup_pyramid(self, config)
