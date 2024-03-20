import re
from typing import Any, NamedTuple, Union
from warnings import warn

from msgspec import UNSET, Struct, UnsetType, defstruct

from nextgisweb.env.model import BaseClass
from nextgisweb.lib.registry import dict_registry

from nextgisweb.core.exception import IUserException

from .exception import AttributeUpdateForbidden
from .scope import ResourceScope


class SerializerBase:
    def __init__(self, obj, user, data=None):
        self.obj = obj
        self.user = user

        if data is None:
            self.data = dict()
            self.keys = None
        else:
            self.data = data
            self.keys = set()

    def is_applicable(self):
        pass

    def serialize(self):
        pass

    def deserialize(self):
        pass

    def mark(self, *keys):
        self.keys.update(keys)

    def has_permission(self, permission):
        return self.obj.has_permission(permission, self.user)


class CRUTypes(NamedTuple):
    create: Any
    read: Any
    update: Any

    @classmethod
    def single(cls, type) -> "CRUTypes":
        return cls(type, type, type)


class SerializedProperty:
    types: CRUTypes = CRUTypes(Any, Any, Any)

    def __init__(self, read=None, write=None, scope=None):
        self.read = read
        self.write = write
        self.scope = scope

        self.srlzrcls = None
        self.attrname = None

    def bind(self, srlzrcls, attrname):
        self.srlzrcls = srlzrcls
        self.attrname = attrname

        if not self.scope:
            self.scope = self.srlzrcls.resclass

    def readperm(self, srlzr):
        return self.read and srlzr.has_permission(self.read)

    def writeperm(self, srlzr):
        return self.write and srlzr.has_permission(self.write)

    def getter(self, srlzr):
        return getattr(srlzr.obj, self.attrname)

    def setter(self, srlzr, value):
        setattr(srlzr.obj, self.attrname, value)

    def serialize(self, srlzr):
        if self.readperm(srlzr):
            srlzr.data[self.attrname] = self.getter(srlzr)

    def deserialize(self, srlzr):
        if self.writeperm(srlzr):
            self.setter(srlzr, srlzr.data[self.attrname])
        else:
            raise AttributeUpdateForbidden(self)


class SerializedColumn(SerializedProperty):
    def bind(self, srlzrcls, prop):
        super().bind(srlzrcls, prop)
        mapper = srlzrcls.resclass.__mapper__
        column = mapper.columns[self.attrname]

        btype = column.type.python_type
        type = btype
        if column.nullable:
            type = Union[type, None]
        self.types = CRUTypes(type, type, type)


class RelationshipRef(Struct, kw_only=True):
    id: int


class SerializedRelationship(SerializedProperty):
    def bind(self, srlzrcls, prop):
        super().bind(srlzrcls, prop)
        mapper = srlzrcls.resclass.__mapper__
        relationship = mapper.relationships[self.attrname]
        if len(pk := mapper.primary_key) != 1 or pk[0].name != "id":
            raise TypeError("Single column 'id' primary key required")
        self.relcls = relationship.mapper.class_
        self.nullable = tuple(relationship.local_columns)[0].nullable

        # Don't overwrite 'types' class attribute
        if "types" not in self.__class__.__dict__:
            btype = RelationshipRef
            if self.nullable:
                btype = Union[btype, None]
            self.types = CRUTypes.single(btype)

    def getter(self, srlzr):
        if (value := super().getter(srlzr)) is None:
            return None
        return dict(id=serval(value.id))

    def setter(self, srlzr, value):
        if value is not None:
            obj = self.relcls.filter_by(id=value["id"]).one()
        else:
            obj = None
        setattr(srlzr.obj, self.attrname, obj)


class SerializedResourceRelationship(SerializedRelationship):
    def getter(self, srlzr):
        if (value := SerializedProperty.getter(self, srlzr)) is None:
            return None
        return dict(id=value.id, parent=dict(id=value.parent_id))


class SerializerMeta(type):
    def __init__(cls, name, bases, nmspc):
        super().__init__(name, bases, nmspc)
        cls._warn_cls_name_conventions(nmspc, depth=1)

        proptab = []
        for prop, sp in nmspc.items():
            if isinstance(sp, SerializedProperty):
                sp.bind(cls, prop)
                proptab.append((prop, sp))
        cls.proptab = proptab

    def _warn_cls_name_conventions(cls, nmspc, *, depth):
        expected = set()
        if (identity := nmspc.get("identity")) is not None:
            camel = re.sub(r"(?:^|_)(\w)", lambda m: m.group(1).upper(), identity)
            expected.add(f"{camel}Serializer")
        if (resclass := nmspc.get("resclass")) is not None:
            camel = resclass.__name__
            expected.add(f"{camel}Serializer")
        cls_name = cls.__name__
        if expected and cls_name.lower() not in (e.lower() for e in expected):
            warn(
                f"{cls_name} should have one of the following names: {', '.join(expected)}",
                stacklevel=2 + depth,
            )


@dict_registry
class Serializer(SerializerBase, metaclass=SerializerMeta):
    identity = None
    resclass = None

    def is_applicable(self):
        return self.resclass and isinstance(self.obj, self.resclass)

    def serialize(self):
        for prop, sp in self.proptab:
            sp.serialize(self)

    def deserialize(self):
        for prop, sp in self.proptab:
            if prop in self.data and prop not in self.keys:
                try:
                    sp.deserialize(self)
                except Exception as exc:
                    self.annotate_exception(exc, sp)
                    raise

    def annotate_exception(self, exc, sp):
        exc.__srlzr_prprt__ = sp.attrname

        try:
            error_info = IUserException(exc)
            error_info.data["attribute"] = sp.attrname
        except TypeError:
            pass

    @classmethod
    def types(cls) -> CRUTypes:
        base = cls.__name__
        if base.endswith("Serializer"):
            base = base[: -len("Serializer")]

        create, read, update = list(), list(), list()
        for pn, prop in cls.proptab:
            fcreate = prop.write is not None or (pn == "cls" and cls.identity == "resource")
            fread = prop.read is not None
            fupdate = prop.write is not None

            pt = prop.types
            if fcreate:
                create.append((pn, Union[pt.create, UnsetType], UNSET))
            if fread:
                rfield = (pt.read,)
                if prop.read is not ResourceScope.read:
                    rfield = (Union[rfield[0], UnsetType], UNSET)  # type: ignore
                read.append((pn, *rfield))
            if fupdate:
                update.append((pn, Union[pt.update, UnsetType], UNSET))

        skwa: Any = dict(kw_only=True, module=cls.__module__)
        return CRUTypes(
            defstruct(f"{base}Create", create, **skwa),
            defstruct(f"{base}Read", read, **skwa),
            defstruct(f"{base}Update", update, **skwa),
        )


class CompositeSerializer(SerializerBase):
    registry = Serializer.registry

    def __init__(self, obj, user, data=None):
        super().__init__(obj, user, data)

        self.members = dict()
        for ident, mcls in self.registry.items():
            if data is None or ident in data:
                mdata = data[ident] if data else None
                mobj = mcls(obj, user, mdata)
                if mobj.is_applicable():
                    self.members[ident] = mobj

    def serialize(self):
        for ident, mobj in self.members.items():
            try:
                mobj.serialize()
                self.data[ident] = mobj.data
            except Exception as exc:
                self.annotate_exception(exc, mobj)
                raise

    def deserialize(self):
        for ident, mobj in self.members.items():
            try:
                if ident in self.data:
                    mobj.deserialize()
            except Exception as exc:
                self.annotate_exception(exc, mobj)
                raise

    def annotate_exception(self, exc, mobj):
        """Adds information about serializer that called the exception to the exception"""

        exc.__srlzr_cls__ = mobj.__class__

        try:
            error_info = IUserException(exc)
            error_info.data["serializer"] = mobj.__class__.identity
        except TypeError:
            pass

    @classmethod
    def types(cls) -> CRUTypes:
        create, read, update = list(), list(), list()
        for k, v in cls.registry.items():
            t = v.types()
            create.append((k, Union[t.create, UnsetType], UNSET))
            read.append((k, Union[t.read, UnsetType], UNSET))
            update.append((k, Union[t.update, UnsetType], UNSET))
        return CRUTypes(
            defstruct("CompositeCreate", create),
            defstruct("CompositeRead", read),
            defstruct("CompositeUpdate", update),
        )


def serval(value):
    if (
        value is None
        or isinstance(value, int)
        or isinstance(value, float)
        or isinstance(value, str)
    ):
        return value
    elif isinstance(value, dict):
        return {serval(k): serval(v) for k, v in value.items()}
    elif isinstance(value, BaseClass):
        return {
            column.name: serval(getattr(value, column.name))
            for column in value.__mapper__.primary_key
        }
    elif hasattr(value, "__iter__"):
        return map(serval, value)
    else:
        raise NotImplementedError()
