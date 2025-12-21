import re
from collections.abc import Mapping
from typing import ClassVar, Type

from typing_extensions import Self

from nextgisweb.env import gettext
from nextgisweb.env.package import pkginfo
from nextgisweb.lib.i18n import TrStr
from nextgisweb.lib.imptool import module_from_stack
from nextgisweb.lib.registry import dict_registry


@dict_registry
class WebMapOptionCategory:
    registry: ClassVar[Mapping[str, Type[Self]]]

    identity: ClassVar[str]
    label: ClassVar[TrStr]
    order: ClassVar[int] = 0

    def __init_subclass__(cls):
        if getattr(cls, "identity", None) is None:
            name = cls.__name__
            assert name.endswith("Category")
            name = name[: -len("Category")]
            snake = re.sub(r"(?<!^)(?=[A-Z])", "_", name).lower()
            cls.identity = snake


class PanelCategory(WebMapOptionCategory):
    label = gettext("Panels")
    order = -80


class ToolCategory(WebMapOptionCategory):
    label = gettext("Tools")
    order = -60


class IdentificationCategory(WebMapOptionCategory):
    label = gettext("Identification")
    order = -40


class MiscellaneousCategory(WebMapOptionCategory):
    label = gettext("Miscellaneous")
    order = 100


@dict_registry
class WebMapOption:
    registry: ClassVar[Mapping[str, Type[Self]]]

    component: ClassVar[str]
    identity: ClassVar[str]

    name: ClassVar[str]
    label: ClassVar[TrStr]
    category: ClassVar[Type[WebMapOptionCategory]] = MiscellaneousCategory
    order: ClassVar[int] = 0

    def __init_subclass__(cls) -> None:
        mod = module_from_stack(depth=1, skip=(__name__,))
        cid = pkginfo.component_by_module(mod)
        assert cid is not None

        cls.component = cid
        cls.identity = f"{cls.component}.{cls.name}"

    @classmethod
    def default(cls) -> bool:
        return False

    @classmethod
    def csetting(cls, name: str) -> bool:
        from nextgisweb.pyramid.api import csetting

        obj = csetting.registry[cls.component][name]
        assert issubclass(obj.gtype, bool)
        return obj.getter()
