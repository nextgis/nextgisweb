from typing import ClassVar, Mapping, Type, TypeVar, Union

from msgspec import Struct, defstruct
from msgspec import _utils as ms_utils
from typing_extensions import Annotated

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

    @property
    def ctype(self) -> Type[Struct]:
        if result := getattr(self, "_types", None):
            return result

        fields = [("resource", ResourceRef)]
        for k, v in ms_utils.get_class_annotations(self).items():
            _, extras = disannotate(v)
            if FM not in extras:
                continue

            fields.append((k, v))

        result = defstruct(
            *[self.__name__, fields],
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
        mod = module_from_stack(depth=1)
        cid = pkginfo.component_by_module(mod)
        assert cid is not None

        cls.component = cid
        cls.identity = f"{cls.component}.{cls.kind}"

    @classmethod
    def url(cls, instance, *, request):
        assert cls.route is not None
        return request.route_url(cls.route, id=instance.resource.id)