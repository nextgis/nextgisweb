from __future__ import annotations

import re
from typing import Any, ClassVar, Literal, Mapping, Tuple, Type, Union, get_type_hints
from warnings import warn

from msgspec import UNSET, Struct, UnsetType, defstruct

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
    resclass: ClassVar[model.Resource]
    proptab: ClassVar[Tuple[Tuple[str, SAttribute], ...]]
    apitype: ClassVar[bool]

    def __init_subclass__(cls, apitype: bool = False):
        super().__init_subclass__()
        cls.check_class_name()
        cls.apitype = apitype

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
            if self.apitype and getattr(self.data, pn, UNSET) is UNSET:
                continue
            elif not self.apitype and pn not in self.data:
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
            if pv.write is not None or (pn == "cls" and cls.identity == "resource"):
                # FIXME: ResourceSerializer.cls create-only attribute workaround
                if not getattr(pv, "required", False):
                    fcreate.append((pn, Union[pt.create, UnsetType], UNSET))
                else:
                    fcreate.append((pn, pt.create))
            if pv.read is not None:
                if pv.read is ResourceScope.read:
                    # ResourceScope.read is the minimum required permission,
                    # without this permission a resource cannot be serialized.
                    fread.append((pn, pt.read))
                else:
                    fread.append((pn, Union[pt.read, UnsetType], UNSET))
            if pv.write is not None:
                # Any attribute can be ommited during update
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
    apitype: ClassVar[bool] = True
    ctypes: ClassVar[Union[CRUTypes, None]] = None

    srlzrcls: Type[Serializer]
    attrname: str
    types: CRUTypes

    def __init_subclass__(cls, apitype=False) -> None:
        super().__init_subclass__()
        cls.apitype = apitype
        mget, mset = [cls.__dict__.get(m) for m in ("get", "set")]
        no_setup_types = "setup_types" not in cls.__dict__
        if apitype and no_setup_types and (mget is not None or mset is not None):
            tget = _type_from_signature(mget, "return") if mget else None
            tset = _type_from_signature(mset, "value") if mset else None
            cls.ctypes = CRUTypes(tset, tget, tset)

    def __init__(
        self,
        read: Union[Permission, None] = None,
        write: Union[Permission, None] = None,
        required: Union[bool, None] = None,
    ):
        self.read = read
        self.write = write
        self.required = required
        if ct := self.ctypes:
            assert read is None or ct.read is not None
            assert write is None or ct.update is not None

    def bind(self, srlzrcls: Type[Serializer], attrname: str):
        self.srlzrcls = srlzrcls
        self.attrname = attrname
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
            apitype = srlzr.apitype and self.apitype
            srlzr.data[self.attrname] = self.get(srlzr) if apitype else self.getter(srlzr)

    def deserialize(self, srlzr: Serializer) -> None:
        if self.writeperm(srlzr):
            if srlzr.apitype and self.apitype:
                value = getattr(srlzr.data, self.attrname)
                assert value is not UNSET
                self.set(srlzr, value, create=srlzr.obj.id is None)
            else:
                self.setter(srlzr, srlzr.data[self.attrname])
        else:
            raise AttributeUpdateForbidden(self)

    # Modern (apitype == True)

    def get(self, srlzr: Serializer) -> Any:
        return getattr(srlzr.obj, self.attrname)

    def set(self, srlzr: Serializer, value: Any, *, create: bool):
        setattr(srlzr.obj, self.attrname, value)

    # Legacy (apitype == False)

    def getter(self, srlzr: Serializer) -> Any:
        return getattr(srlzr.obj, self.attrname)

    def setter(self, srlzr: Serializer, value: Any) -> None:
        setattr(srlzr.obj, self.attrname, value)


def _type_from_signature(fn, param: Literal["value", "return"]) -> Any:
    hints = get_type_hints(fn)
    type = hints.get(param)
    assert type is not None, f"type annotation missing: {param}"
    return type
