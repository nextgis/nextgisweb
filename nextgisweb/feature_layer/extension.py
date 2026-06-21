from __future__ import annotations

import abc
from abc import abstractmethod
from typing import Any, ClassVar

from nextgisweb.lib.registry import DictRegistry, dict_registry


@dict_registry
class FeatureExtension(abc.ABC):
    registry: ClassVar[DictRegistry[type["FeatureExtension"]]]

    def __init__(self, layer):
        self._layer = layer

    @property
    def layer(self):
        return self._layer

    @abstractmethod
    def serialize(self, feature, *, version=None) -> Any:
        pass

    @abstractmethod
    def deserialize(self, feature, data) -> bool:
        pass
