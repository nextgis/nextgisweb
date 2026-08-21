from __future__ import annotations

from datetime import date, datetime
from typing import Annotated, Any, Literal

import sqlalchemy as sa
import sqlalchemy.orm as orm
from msgspec import Struct

from nextgisweb.lib.apitype.util import is_enum_type
from nextgisweb.lib.msext import DEPRECATED

from . import model
from .serialize import CRUTypes, SAttribute, Serializer


def _mapper(cls: type[model.Resource]) -> orm.Mapper:
    result = getattr(cls, "__mapper__")
    assert isinstance(result, orm.Mapper)
    return result


class SColumn[S: Serializer](SAttribute[S]):
    def setup_types(self) -> None:
        self.column = _mapper(self.srlzrcls.resclass).columns[self.model_attr]
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
                    type = Literal[tuple(col_type.enums)]  # ty: ignore[invalid-type-form]

            if self.column.nullable:
                type = type | None

            self.types = CRUTypes(type, type, type)


class RelationshipRef(Struct, kw_only=True):
    id: int


class SRelationship[S: Serializer](SAttribute[S]):
    def bind(self, srlzrcls: type[S], attrname: str) -> None:
        mapper = _mapper(srlzrcls.resclass)
        relationship = mapper.relationships[attrname]
        if len(pk := mapper.primary_key) != 1 or pk[0].name != "id":
            raise TypeError("Single column 'id' primary key required")
        self.relcls = relationship.mapper.class_

        self.column = tuple(relationship.local_columns)[0]
        if self.required is None:
            self.required = not self.column.nullable and self.column.default is None

        super().bind(srlzrcls, attrname)

    def setup_types(self) -> None:
        vtype = RelationshipRef
        if self.column.nullable:
            vtype = vtype | None
        self.types = CRUTypes(vtype, vtype, vtype)

    def get(self, srlzr: S) -> Any:
        obj = super().get(srlzr)
        return RelationshipRef(id=obj.id) if obj is not None else None

    def set(self, srlzr: S, value: Any, *, create: bool) -> None:
        if value is not None:
            obj = self.relcls.filter_by(id=value.id).one()
        else:
            obj = None
        super().set(srlzr, obj, create=create)


class ResourceRef(RelationshipRef, kw_only=True):
    id: int


class ResourceRefOptional(Struct, kw_only=True):
    id: int | None


class ResourceRefWithParent(ResourceRef, kw_only=True):
    parent: Annotated[ResourceRefOptional, DEPRECATED]


class SResource[S: Serializer](SRelationship[S]):
    def setup_types(self) -> None:
        types = (ResourceRef, ResourceRefWithParent, ResourceRef)
        if self.column.nullable:
            types = tuple(type | None for type in types)
        self.types = CRUTypes(*types)

    def get(self, srlzr: S) -> ResourceRefWithParent | None:
        if (value := SAttribute.get(self, srlzr)) is None:
            return None
        parent = ResourceRefOptional(id=value.parent_id)
        return ResourceRefWithParent(id=value.id, parent=parent)
