import re
from typing import Annotated, ClassVar, Mapping, Type, TypeVar, Union

from msgspec import Struct, defstruct
from msgspec import _utils as ms_utils

from nextgisweb.env.package import pkginfo
from nextgisweb.lib.apitype import disannotate
from nextgisweb.lib.i18n import TrStr
from nextgisweb.lib.imptool import module_from_stack
from nextgisweb.lib.registry import dict_registry

from nextgisweb.resource.sattribute import ResourceRef

T, FM = TypeVar("T"), "ResourceFavoriteField"
Field = Annotated[T, FM]


class ResourceFavoriteMeta(type):
    identity: str
    route: Union[str, None]

    @property
    def ctype(self) -> Type[Struct]:
        if result := getattr(self, "_types", None):
            return result

        fields = [("resource", ResourceRef)]
        if self.route is None:
            fields.append(("label", Union[str, None], None))  # type: ignore

        for k, v in ms_utils.get_class_annotations(self).items():
            _, extras = disannotate(v)
            if FM in extras:
                fields.append((k, v))

        result = defstruct(
            *[self.__name__, fields],
            kw_only=True,
            tag_field="identity",
            tag=self.identity,
            module=self.__module__,
        )

        setattr(self, "_types", result)
        return result


@dict_registry
class ResourceFavorite(metaclass=ResourceFavoriteMeta):
    registry: ClassVar[Mapping[str, Type["ResourceFavorite"]]]
    identity: ClassVar[str]
    component: ClassVar[str]

    kind: ClassVar[str]
    route: ClassVar[Union[str, None]] = None
    label: ClassVar[TrStr]
    icon: ClassVar[str]

    def __init_subclass__(cls) -> None:
        mod = module_from_stack(depth=1, skip=(__name__,))
        cid = pkginfo.component_by_module(mod)
        assert cid is not None

        cls.component = cid
        cls.identity = f"{cls.component}.{cls.kind}"

    @classmethod
    def url(cls, instance, *, request):
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
