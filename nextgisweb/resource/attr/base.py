from typing import TYPE_CHECKING, Any, Protocol, Union

from msgspec import Struct, defstruct
from typing_extensions import ClassVar, Self, get_annotations

from nextgisweb.auth import User

from ..model import Resource, ResourceSerializer
from ..serialize import SAttribute, Serializer


class ResourceAttrContext(Protocol):
    @property
    def user(self) -> User: ...

    @property
    def translate(self) -> Any: ...


class ResourceAttr(Struct, array_like=True):
    registry: ClassVar[list[type[Self]]] = []

    def __init_subclass__(cls, **kwargs):
        super().__init_subclass__(**kwargs)
        if cls.__name__ != "ResourceAttrSAttribute":
            if not hasattr(cls, "__call__"):
                raise TypeError(f"{cls.__name__} must implement '__call__' method")
            cls.registry.append(cls)

    @classmethod
    def return_type(cls) -> Any:
        return get_annotations(cls.__call__, eval_str=True)["return"]

    @staticmethod
    def argument_type() -> Any:
        """Union of all registered attribute types"""
        return Union[tuple(ResourceAttr.registry)]

    @staticmethod
    def helper_struct() -> type[Struct]:
        """Struct exposing all registered attribute types to TypeScript"""
        fields: list[tuple[str, type]] = list()
        rename: dict[str, str] = dict()
        for i, a in enumerate(ResourceAttr.registry):
            name = f"attr_{i}"
            tag = a.__struct_config__.tag
            assert isinstance(tag, str)
            fields.append((name, a.return_type()))
            rename[name] = tag
        return defstruct(
            "ResourceAttrTypes",
            fields,
            module=__name__,
            rename=rename,
        )

    if TYPE_CHECKING:

        def __call__(self, obj: Resource, *, ctx: ResourceAttrContext) -> Any:
            """Compute attribute value for given resource and user

            This method must be implemented by subclasses. ResourceScope.read
            permission is checked before calling this method, other permissions
            must be checked inside the method if needed."""


class ResourceAttrSAttribute(ResourceAttr):
    sattribute: ClassVar[SAttribute]

    @classmethod
    def return_type(cls):
        return cls.sattribute.types.read


def register_sattributess():
    def _camelize(s: str) -> str:
        parts = s.split("_")
        return "".join(word.capitalize() for word in parts)

    existing_attr_tags = {i.__struct_config__.tag for i in ResourceAttr.registry}

    for skey, scls in Serializer.registry.items():
        for sattr_key, sattr in scls.proptab:
            if not sattr.read:
                # Skip write-only attributes
                continue
            if scls is ResourceSerializer and sattr_key in ("id", "parent", "permissions"):
                # ID make no sense here, parent is handled separately
                continue

            name = scls.__name__.removesuffix("Serializer") + "Attr"
            name += _camelize(sattr_key)
            tag = f"{skey}.{sattr_key}"

            if tag in existing_attr_tags:
                # Skip already registered attributes (e.g. from plugins), this
                # may occur if running tests.
                continue

            defstruct(
                name,
                (),
                bases=(ResourceAttrSAttribute,),
                tag=tag,
                module=scls.__module__,
                namespace=dict(sattribute=sattr),
            )
