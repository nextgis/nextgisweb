import re
from functools import cache
from typing import Annotated, ClassVar, TypeVar

from msgspec import Struct, defstruct
from msgspec import _utils as ms_utils

from nextgisweb.env.package import pkginfo
from nextgisweb.lib.apitype import disannotate
from nextgisweb.lib.i18n import TrStr
from nextgisweb.lib.imptool import module_from_stack
from nextgisweb.lib.registry import DictRegistry, dict_registry

from nextgisweb.pyramid.tomb import Request
from nextgisweb.resource.sattribute import ResourceRef


class _ResourceFavoriteField:
    pass


T = TypeVar("T")
Field = Annotated[T, _ResourceFavoriteField]


@dict_registry
class ResourceFavorite:
    registry: ClassVar[DictRegistry[type["ResourceFavorite"]]]

    identity: ClassVar[str]
    component: ClassVar[str]

    kind: ClassVar[str]
    route: ClassVar[str | None] = None
    label: ClassVar[TrStr]
    icon: ClassVar[str]

    def __init_subclass__(cls) -> None:
        mod = module_from_stack(depth=1, skip=(__name__,))
        cid = pkginfo.component_by_module(mod)
        assert cid is not None

        cls.component = cid
        cls.identity = f"{cls.component}.{cls.kind}"

    @classmethod
    @cache
    def ctype(cls) -> type[Struct]:
        fields: list[tuple] = [("resource", ResourceRef)]
        if cls.route is None:
            fields.append(("label", str | None, None))

        for k, v in ms_utils.get_class_annotations(cls).items():
            _, extras = disannotate(v)
            if _ResourceFavoriteField in extras:
                fields.append((k, v))

        return defstruct(
            cls.__name__,
            fields,
            kw_only=True,
            tag_field="identity",
            tag=cls.identity,
            module=cls.__module__,
        )

    @classmethod
    def url(cls, instance, *, request: Request):
        assert cls.route is not None
        return request.route_url(cls.route, id=instance.resource.id)


def from_route(route: str, label: TrStr, *, icon: str):
    class_name = re.sub(r"(?:^|[._])(.)", lambda m: m.group(1).upper(), route) + "Favorite"
    _, kind = route.split(".", 1)

    type(
        class_name,
        (ResourceFavorite,),
        dict(
            kind=kind,
            route=route,
            label=label,
            icon=icon,
        ),
    )
