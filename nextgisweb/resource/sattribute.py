from __future__ import annotations

from datetime import date, datetime
from typing import Any, Dict, Union

from msgspec import Struct
from typing_extensions import Annotated

from nextgisweb.lib.msext import DEPRECATED

from .serialize import CRUTypes, SAttribute


class SColumn(SAttribute, apitype=True):
    def bind(self, srlzrcls, attrname):
        self.column = srlzrcls.resclass.__mapper__.columns[attrname]
        if self.required is None:
            self.required = not self.column.nullable and self.column.default is None
        super().bind(srlzrcls, attrname)

    def setup_types(self):
        if self.ctypes is not None:
            self.types = self.ctypes
        else:
            type = self.column.type.python_type
            if type not in (str, int, float, bool, date, datetime):
                raise NotImplementedError(f"{self.column} has unsupported type: {type}")

            if self.column.nullable:
                type = Union[type, None]

            self.types = CRUTypes(type, type, type)


class RelationshipRef(Struct, kw_only=True):
    id: int


class SRelationship(SAttribute, apitype=True):
    def bind(self, srlzrcls, attrname):
        mapper = srlzrcls.resclass.__mapper__
        relationship = mapper.relationships[attrname]
        if len(pk := mapper.primary_key) != 1 or pk[0].name != "id":
            raise TypeError("Single column 'id' primary key required")
        self.relcls = relationship.mapper.class_

        self.column = tuple(relationship.local_columns)[0]
        if self.required is None:
            self.required = not self.column.nullable and self.column.default is None

        super().bind(srlzrcls, attrname)

    def setup_types(self):
        vtype = RelationshipRef
        if self.column.nullable:
            vtype = Union[type, None]
        self.types = CRUTypes(vtype, vtype, vtype)

    def get(self, srlzr) -> Any:
        obj = super().get(srlzr)
        return RelationshipRef(id=obj.id) if obj is not None else None

    def set(self, srlzr, value: Any, *, create: bool):
        if value is not None:
            obj = self.relcls.filter_by(id=value.id).one()
        else:
            obj = None
        super().set(srlzr, obj, create=create)

    # Legacy (apitype == False)

    def getter(self, srlzr) -> Union[Dict[str, int], None]:
        if (value := super().getter(srlzr)) is None:
            return None
        return dict(id=value.id)

    def setter(self, srlzr, value: Union[Dict[str, int], None]):
        if value is not None:
            obj = self.relcls.filter_by(id=value["id"]).one()
        else:
            obj = None
        setattr(srlzr.obj, self.attrname, obj)


class ResourceRef(RelationshipRef, kw_only=True):
    id: int


class ResourceRefOptional(Struct, kw_only=True):
    id: Union[int, None]


class ResourceRefWithParent(ResourceRef, kw_only=True):
    parent: Annotated[ResourceRefOptional, DEPRECATED]


class SResource(SRelationship, apitype=True):
    def setup_types(self):
        types = (ResourceRef, ResourceRefWithParent, ResourceRef)
        if self.column.nullable:
            types = tuple(Union[type, None] for type in types)
        self.types = CRUTypes(*types)

    def get(self, srlzr) -> Union[ResourceRefWithParent, None]:
        if (value := SAttribute.getter(self, srlzr)) is None:
            return None
        parent = ResourceRefOptional(id=value.parent_id)
        return ResourceRefWithParent(id=value.id, parent=parent)

    # Legacy (apitype == False)

    def getter(self, srlzr) -> Union[dict, None]:
        if (value := SAttribute.getter(self, srlzr)) is None:
            return None
        parent = dict(id=value.parent_id)
        return dict(id=value.id, parent=parent)
