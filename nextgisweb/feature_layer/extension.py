from typing import Tuple

from ..registry import registry_maker


class FeatureExtension:
    registry = registry_maker()

    def __init__(self, layer):
        self._layer = layer

    @property
    def layer(self):
        return self._layer

    def count(self):
        raise NotImplementedError()

    def bulk_serialize(self, features) -> Tuple[int, list]:
        raise NotImplementedError()

    def serialize(self, feature):
        count, data = self.bulk_serialize([feature])
        return data[0]
