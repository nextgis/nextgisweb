from __future__ import annotations

import abc
from abc import abstractmethod
from collections.abc import Mapping
from typing import Any, Type

from nextgisweb.lib.registry import dict_registry


@dict_registry
class FeatureExtension(abc.ABC):
    registry: Mapping[str, Type[FeatureExtension]]

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
