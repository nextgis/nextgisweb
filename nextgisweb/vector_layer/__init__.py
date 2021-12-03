from ..component import Component, require
from ..lib.config import Option

from . import command  # NOQA
from .kind_of_data import VectorLayerData
from .model import Base, VectorLayer, estimate_vector_layer_data

__all__ = [
    'VectorLayerComponent',
    'VectorLayer',
]


class VectorLayerComponent(Component):
    identity = 'vector_layer'
    metadata = Base.metadata

    @require('feature_layer', 'layer')
    def setup_pyramid(self, config):
        from . import api, view  # NOQA: F401
        api.setup_pyramid(self, config)

    def client_settings(self, request):
        return dict(show_create_mode=self.options['show_create_mode'])

    def estimate_storage(self):
        for resource in VectorLayer.query():
            size = estimate_vector_layer_data(resource)
            yield VectorLayerData, resource.id, size

    option_annotations = (
        Option('show_create_mode', bool, default=False),
    )
