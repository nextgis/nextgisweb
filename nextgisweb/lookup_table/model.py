from enum import Enum
from typing import Literal, Union

import sqlalchemy as sa
from msgspec import UNSET, UnsetType

from nextgisweb.env import Base, gettext
from nextgisweb.lib import saext

from nextgisweb.core.exception import ValidationError
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
    CUSTOM = "CUSTOM"


class LookupTable(Base, Resource):
    identity = "lookup_table"
    cls_display_name = gettext("Lookup table")

    value = sa.Column(saext.Msgspec(list[tuple[str, str]]), nullable=False, default=list)
    sort = sa.Column(saext.Enum(SortEnum), nullable=False, default=SortEnum.KEY_ASC)

    @classmethod
    def check_parent(cls, parent):
        return isinstance(parent, ResourceGroup)


def sort_items(items, sort, order):
    if (sort := SortEnum(sort)) is SortEnum.CUSTOM:
        if order is not UNSET:
            try:
                items = sorted(items, key=lambda p: order.index(p[0]))
            except ValueError:
                raise ValidationError("Invalid items order.")
        return items

    elif sort is SortEnum.KEY_ASC:
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
            srlzr.obj.value = srlzr._sort_items(srlzr.obj.value)


class ItemsAttr(SAttribute):
    def get(self, srlzr) -> dict[str, str]:
        return dict(srlzr.obj.value)

    def set(self, srlzr, value: dict[str, str], *, create: bool):
        items = [(k, v) for k, v in value.items()]
        srlzr.obj.value = srlzr._sort_items(items)


class OrderAttr(SAttribute):
    def get(self, srlzr) -> list[str]:
        return [k for k, v in srlzr.obj.value]

    def set(self, srlzr, value: list[str] | UnsetType, *, create: bool):
        pass


class LookupTableSerializer(Serializer, resource=LookupTable):
    sort = SortAttr(read=ResourceScope.read, write=ResourceScope.update)
    items = ItemsAttr(read=ResourceScope.read, write=ResourceScope.update)
    order = OrderAttr(read=ResourceScope.read, write=ResourceScope.update)

    def _sort_items(self, items):
        sort = self.obj.sort or SortEnum.KEY_ASC
        return sort_items(items, sort, self.data.order)
