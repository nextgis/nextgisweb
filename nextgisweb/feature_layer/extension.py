
from ..registry import registry_maker


class FeatureExtension(object):
    registry = registry_maker()

    def __init__(self, layer):
        self._layer = layer

    @property
    def layer(self):
        return self._layer
