from __future__ import annotations

import re
from collections.abc import Mapping
from typing import Annotated, ClassVar, Type

from nextgisweb.env import gettext
from nextgisweb.lib.apitype import Gap
from nextgisweb.lib.i18n import TrStr
from nextgisweb.lib.registry import dict_registry

from nextgisweb.jsrealm import TSExport

ResourceCategoryIdentity = Annotated[
    Gap("ResourceCategoryIdentity", str),
    TSExport("ResourceCategoryIdentity"),
]


@dict_registry
class ResourceCategory:
    registry: ClassVar[Mapping[str, Type[ResourceCategory]]]

    identity: ClassVar[str]
    label: ClassVar[TrStr]
    order: ClassVar[int]

    def __init_subclass__(cls):
        if getattr(cls, "identity", None) is None:
            name = cls.__name__
            assert name.endswith("Category")
            name = name[: -len("Category")]
            snake = re.sub(r"(?<!^)(?=[A-Z])", "_", name).lower()
            cls.identity = snake


class LayersAndStylesCategory(ResourceCategory):
    label = gettext("Layers and styles")
    order = 20


class MapsAndServicesCategory(ResourceCategory):
    label = gettext("Maps and services")
    order = 40


class FieldDataCollectionCategory(ResourceCategory):
    label = gettext("Field data collection")
    order = 60


class ExternalConnectionsCategory(ResourceCategory):
    label = gettext("External connections")
    order = 80


class MiscellaneousCategory(ResourceCategory):
    label = gettext("Miscellaneous")
    order = 100
