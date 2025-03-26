from enum import Enum
from typing import Dict, List, Literal, Tuple, Union

import sqlalchemy as sa
from msgspec import UNSET

from nextgisweb.env import Base, gettext
from nextgisweb.lib import saext

from nextgisweb.resource import (
    CRUTypes,
    Resource,
    ResourceGroup,
    ResourceScope,
    SAttribute,
    SColumn,
    Serializer,
)

Base.depends_on("resource")


class SortEnum(Enum):
    KEY_ASC = "KEY_ASC"
    KEY_DESC = "KEY_DESC"
    VALUE_ASC = "VALUE_ASC"
    VALUE_DESC = "VALUE_DESC"


class LookupTable(Base, Resource):
    identity = "lookup_table"
    cls_display_name = gettext("Lookup table")

    value = sa.Column(saext.Msgspec(List[Tuple[str, str]]), nullable=False, default=list)
    sort = sa.Column(saext.Enum(SortEnum), nullable=False, default=SortEnum.KEY_ASC)

    @classmethod
    def check_parent(cls, parent):
        return isinstance(parent, ResourceGroup)


def sort_items(items, sort):
    sort = SortEnum(sort)
    if sort is SortEnum.KEY_ASC:
        idx = 0
        reverse = False
    elif sort is SortEnum.KEY_DESC:
        idx = 0
        reverse = True
    elif sort is SortEnum.VALUE_ASC:
        idx = 1
        reverse = False
    elif sort is SortEnum.VALUE_DESC:
        idx = 1
        reverse = True
    else:
        raise NotImplementedError

    return sorted(items, key=lambda p: p[idx], reverse=reverse)


Sort = Union[tuple(Literal[i.value] for i in SortEnum)]


class SortAttr(SColumn):
    ctypes = CRUTypes(Sort, Sort, Sort)

    def set(self, srlzr, *args, **kw):
        super().set(srlzr, *args, **kw)
        if srlzr.data.items is UNSET:
            srlzr.obj.value = sort_items(srlzr.obj.value, srlzr.obj.sort)


class ItemsAttr(SAttribute):
    def get(self, srlzr) -> Dict[str, str]:
        return dict(srlzr.obj.value)

    def set(self, srlzr, value: Dict[str, str], *, create: bool):
        items = [(k, v) for k, v in value.items()]
        srlzr.obj.value = sort_items(items, srlzr.obj.sort)


class LookupTableSerializer(Serializer, resource=LookupTable):
    sort = SortAttr(read=ResourceScope.read, write=ResourceScope.update)
    items = ItemsAttr(read=ResourceScope.read, write=ResourceScope.update)
