from typing import TYPE_CHECKING, Any, Protocol, Union

from msgspec import Struct, UnsetType, defstruct
from typing_extensions import ClassVar, Self, get_annotations

from nextgisweb.auth import User
from nextgisweb.resource.scope import ResourceScope

from ..model import Resource, ResourceSerializer
from ..serialize import SAttribute, Serializer


class ResourceAttrContext(Protocol):
    @property
    def user(self) -> User: ...

    @property
    def translate(self) -> Any: ...


class ResourceAttr(Struct, array_like=True):
    registry: ClassVar[list[type[Self]]] = []

    mandatory: ClassVar[bool] = False
    """If true, the attribute is defined for any resource and can be read
    without additional permission checks (only ResourceScope.read permission is
    required)."""

    def __init_subclass__(cls, **kwargs):
        super().__init_subclass__(**kwargs)
        if cls.__name__ != "ResourceAttrSAttribute":
            if not hasattr(cls, "__call__"):
                raise TypeError(f"{cls.__name__} must implement '__call__' method")
            cls.registry.append(cls)

    @classmethod
    def return_type(cls) -> Any:
        return_type = get_annotations(cls.__call__, eval_str=True).get("return")
        return return_type if cls.mandatory else (return_type | UnsetType)

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
        return_type = cls.sattribute.types.read
        return return_type if cls.mandatory else (return_type | UnsetType)


def register_sattributess():
    def _camelize(s: str) -> str:
        parts = s.split("_")
        return "".join(word.capitalize() for word in parts)

    existing_attr_tags = {i.__struct_config__.tag for i in ResourceAttr.registry}

    for skey, scls in Serializer.registry.items():
        for sattribute_key, sattribute in scls.proptab:
            if not sattribute.read:
                # Skip write-only attributes
                continue
            if scls is ResourceSerializer and sattribute_key in ("id", "parent", "permissions"):
                # ID make no sense here, parent is handled separately
                continue

            name = scls.__name__.removesuffix("Serializer") + "Attr"
            name += _camelize(sattribute_key)
            tag = f"{skey}.{sattribute_key}"

            if tag in existing_attr_tags:
                # Skip already registered attributes (e.g. from plugins), this
                # may occur if running tests.
                continue

            mandatory = scls is ResourceSerializer and sattribute.read == ResourceScope.read
            defstruct(
                name,
                (),
                bases=(ResourceAttrSAttribute,),
                tag=tag,
                module=scls.__module__,
                namespace=dict(sattribute=sattribute, mandatory=mandatory),
            )
