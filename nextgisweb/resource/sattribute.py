from __future__ import annotations

from datetime import date, datetime
from typing import Annotated, Any, Literal, Union

import sqlalchemy as sa
from msgspec import Struct

from nextgisweb.lib.apitype.util import is_enum_type
from nextgisweb.lib.msext import DEPRECATED

from .serialize import CRUTypes, SAttribute


class SColumn(SAttribute):
    def setup_types(self):
        self.column = self.srlzrcls.resclass.__mapper__.columns[self.model_attr]
        if self.required is None:
            self.required = not self.column.nullable and self.column.default is None

        if self.ctypes is not None:
            self.types = self.ctypes
        else:
            type = self.column.type.python_type
            if is_enum_type(type):
                pass
            else:
                if type not in (str, int, float, bool, date, datetime):
                    raise NotImplementedError(f"{self.column} has unsupported type: {type}")

                col_type = self.column.type
                if isinstance(col_type, sa.Enum):
                    type = Union[tuple(Literal[i] for i in col_type.enums)]  # type: ignore

            if self.column.nullable:
                type = Union[type, None]

            self.types = CRUTypes(type, type, type)


class RelationshipRef(Struct, kw_only=True):
    id: int


class SRelationship(SAttribute):
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
            vtype = Union[vtype, None]
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


class ResourceRef(RelationshipRef, kw_only=True):
    id: int


class ResourceRefOptional(Struct, kw_only=True):
    id: Union[int, None]


class ResourceRefWithParent(ResourceRef, kw_only=True):
    parent: Annotated[ResourceRefOptional, DEPRECATED]


class SResource(SRelationship):
    def setup_types(self):
        types = (ResourceRef, ResourceRefWithParent, ResourceRef)
        if self.column.nullable:
            types = tuple(Union[type, None] for type in types)
        self.types = CRUTypes(*types)

    def get(self, srlzr) -> Union[ResourceRefWithParent, None]:
        if (value := SAttribute.get(self, srlzr)) is None:
            return None
        parent = ResourceRefOptional(id=value.parent_id)
        return ResourceRefWithParent(id=value.id, parent=parent)
