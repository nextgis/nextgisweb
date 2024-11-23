from __future__ import annotations

import re
from typing import Any, ClassVar, Literal, Mapping, Tuple, Type, Union, cast, get_type_hints
from warnings import warn

from msgspec import UNSET, Struct, UnsetType, defstruct

from nextgisweb.lib.apitype.util import decompose_union
from nextgisweb.lib.registry import dict_registry

from nextgisweb.auth import User
from nextgisweb.core.exception import IUserException

from . import model
from .exception import AttributeUpdateForbidden
from .permission import Permission
from .scope import ResourceScope


class CRUTypes(Struct, frozen=True):
    create: Any
    read: Any
    update: Any


@dict_registry
class Serializer:
    registry: ClassVar[Mapping[str, Type[Serializer]]]
    identity: ClassVar[str]
    resclass: ClassVar[Type[model.Resource]]
    proptab: ClassVar[Tuple[Tuple[str, SAttribute], ...]]
    model_prefix: ClassVar[Union[str, None]]

    def __init_subclass__(
        cls,
        *,
        resource: Union[Type[model.Resource], None] = None,
        apitype: Union[bool, None] = None,
        model_prefix: Union[str, None] = None,
    ):
        assert resource is not None
        assert (apitype is None) or (apitype is True)

        super().__init_subclass__()

        cls.resclass = resource

        if not hasattr(cls, "identity"):
            cls.identity = resource.identity

        cls.check_class_name()
        cls.model_prefix = model_prefix

        proptab = []
        for pn, pv in cls.__dict__.items():
            if isinstance(pv, SAttribute):
                pv.bind(cls, pn)
                proptab.append((pn, pv))
        cls.proptab = tuple(proptab)

    def __init__(self, obj: model.Resource, user: User, data=None):
        self.obj = obj
        self.user = user
        self.data = dict() if data is None else data

    def is_applicable(self) -> bool:
        return isinstance(self.obj, self.resclass)

    def serialize(self) -> None:
        for _, pv in self.proptab:
            pv.serialize(self)

    def deserialize(self) -> None:
        for pn, pv in self.proptab:
            if getattr(self.data, pn, UNSET) is UNSET:
                continue
            try:
                pv.deserialize(self)
            except Exception as exc:
                self.annotate_exception(exc, pv)
                raise

    def annotate_exception(self, exc, sp):
        exc.__srlzr_prprt__ = sp.attrname

        try:
            error_info = IUserException(exc)
            error_info.data["attribute"] = sp.attrname
        except TypeError:
            pass

    def has_permission(self, perm: Permission) -> bool:
        """Test for permission on attached resource"""
        return self.obj.has_permission(perm, self.user)

    @classmethod
    def types(cls) -> CRUTypes:
        # Strip the "Serializer" suffix and use as basename
        base = cls.__name__
        if base.endswith("Serializer"):
            base = base[: -len("Serializer")]

        fcreate, fread, fupdate = list(), list(), list()
        for pn, pv in cls.proptab:
            pt = pv.types
            if pv.write is not None:
                if not getattr(pv, "required", False):
                    fcreate.append((pn, Union[pt.create, UnsetType], UNSET))
                elif UnsetType in decompose_union(pt.create):
                    fcreate.append((pn, pt.create, UNSET))
                else:
                    fcreate.append((pn, pt.create))
            if pv.read is not None:
                if pv.read is ResourceScope.read:
                    # ResourceScope.read is the minimum required permission,
                    # without this permission a resource cannot be serialized.
                    # But it stil may contain UnsetType, then we need set UNSET
                    # as default value.
                    if UnsetType in decompose_union(pt.read):
                        fread.append((pn, pt.read, UNSET))
                    else:
                        fread.append((pn, pt.read))
                else:
                    fread.append((pn, Union[pt.read, UnsetType], UNSET))
            if pv.write is not None:
                # Any attribute can be ommited during update. Attributes of
                # UnsetType are skipped entirely.
                if pt.update != UnsetType:
                    fupdate.append((pn, Union[pt.update, UnsetType], UNSET))

        skwa: Any = dict(kw_only=True, module=cls.__module__)
        return CRUTypes(
            defstruct(f"{base}Create", fcreate, **skwa),
            defstruct(f"{base}Read", fread, **skwa),
            defstruct(f"{base}Update", fupdate, **skwa),
        )

    @classmethod
    def check_class_name(cls):
        id_camel = re.sub(r"(?:^|_)(\w)", lambda m: m.group(1).upper(), cls.identity)
        expected = {f"{cls.resclass.__name__}Serializer", f"{id_camel}Serializer"}

        cls_name = cls.__name__
        if expected and cls_name.lower() not in (e.lower() for e in expected):
            warn(f"{cls_name} should have one of the following names: {', '.join(expected)}")


class SAttribute:
    ctypes: ClassVar[Union[CRUTypes, None]] = None

    srlzrcls: Type[Serializer]
    attrname: str
    model_attr: str
    types: CRUTypes

    def __init_subclass__(cls, apitype: Union[bool, None] = None) -> None:
        assert (apitype is None) or (apitype is True)

        super().__init_subclass__()
        if cls.ctypes is None:
            mget, mset = [cls.__dict__.get(m) for m in ("get", "set")]
            no_setup_types = "setup_types" not in cls.__dict__
            if no_setup_types and (mget is not None or mset is not None):
                tget = _type_from_signature(mget, "return") if mget else None
                tset = _type_from_signature(mset, "value") if mset else None
                cls.ctypes = CRUTypes(tset, tget, tset)

    def __init__(
        self,
        read: Union[Permission, None] = None,
        write: Union[Permission, None] = None,
        required: Union[bool, None] = None,
        model_attr: Union[str, None] = None,
    ):
        self.read = read
        self.write = write
        self.required = required
        self.model_attr = cast(str, model_attr)
        if ct := self.ctypes:
            assert read is None or ct.read is not None
            assert write is None or ct.update is not None

    def bind(self, srlzrcls: Type[Serializer], attrname: str):
        self.srlzrcls = srlzrcls
        self.attrname = attrname
        if self.model_attr is None:
            self.model_attr = (srlzrcls.model_prefix or "") + attrname
        self.setup_types()

    def setup_types(self):
        if self.ctypes:
            self.types = self.ctypes
        else:
            self.types = CRUTypes(Any, Any, Any)

    def readperm(self, srlzr: Serializer) -> bool:
        return False if ((perm := self.read) is None) else srlzr.has_permission(perm)

    def writeperm(self, srlzr: Serializer) -> bool:
        return False if ((perm := self.write) is None) else srlzr.has_permission(perm)

    def serialize(self, srlzr: Serializer) -> None:
        if self.readperm(srlzr):
            if (value := self.get(srlzr)) is not UNSET:
                srlzr.data[self.attrname] = value

    def deserialize(self, srlzr: Serializer) -> None:
        if self.writeperm(srlzr):
            value = getattr(srlzr.data, self.attrname)
            assert value is not UNSET
            self.set(srlzr, value, create=srlzr.obj.id is None)
        else:
            raise AttributeUpdateForbidden(self)

    def get(self, srlzr: Serializer) -> Any:
        return getattr(srlzr.obj, self.model_attr)

    def set(self, srlzr: Serializer, value: Any, *, create: bool):
        setattr(srlzr.obj, self.model_attr, value)


def _type_from_signature(fn, param: Literal["value", "return"]) -> Any:
    hints = get_type_hints(fn)
    type = hints.get(param)
    assert type is not None, f"type annotation missing: {param}"
    return type
