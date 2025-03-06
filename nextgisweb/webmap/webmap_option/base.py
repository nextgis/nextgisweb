import re
from typing import ClassVar, Mapping, Type

from nextgisweb.env import gettext
from nextgisweb.env.package import pkginfo
from nextgisweb.lib.i18n import TrStr
from nextgisweb.lib.imptool import module_from_stack
from nextgisweb.lib.registry import dict_registry


@dict_registry
class WebMapOptionCategory:
    registry: ClassVar[Mapping[str, Type["WebMapOptionCategory"]]]

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


class MiscellaneousCategory(WebMapOptionCategory):
    label = gettext("Miscellaneous")
    order = 100


class ToolCategory(WebMapOptionCategory):
    label = gettext("Tool")
    order = 150


class PanelCategory(WebMapOptionCategory):
    label = gettext("Panel")
    order = 200


class WebMapOptionMeta(type):
    identity: str


@dict_registry
class WebMapOption(metaclass=WebMapOptionMeta):
    registry: ClassVar[Mapping[str, Type["WebMapOption"]]]
    identity: ClassVar[str]
    component: ClassVar[str]
    order: ClassVar[int]

    name: ClassVar[str]
    label: ClassVar[TrStr]
    default: ClassVar[bool]
    category: ClassVar[WebMapOptionCategory]

    def __init_subclass__(cls) -> None:
        mod = module_from_stack(depth=1, skip=(__name__,))
        cid = pkginfo.component_by_module(mod)
        assert cid is not None

        cls.component = cid
        cls.identity = f"{cls.component}.{cls.name}"
        assert isinstance(cls.default, bool)

        if getattr(cls, "category", None) is None:
            cls.category = MiscellaneousCategory
