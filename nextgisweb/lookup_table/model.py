from typing import Dict

from sqlalchemy.dialects.postgresql import HSTORE
from sqlalchemy.ext.mutable import MutableDict

from nextgisweb.env import Base, gettext
from nextgisweb.lib import db

from nextgisweb.resource import (
    DataScope,
    Resource,
    ResourceGroup,
    ResourceScope,
    SAttribute,
    Serializer,
)

Base.depends_on("resource")


class LookupTable(Base, Resource):
    identity = "lookup_table"
    cls_display_name = gettext("Lookup table")

    __scope__ = DataScope

    val = db.Column(MutableDict.as_mutable(HSTORE))

    @classmethod
    def check_parent(cls, parent):
        return isinstance(parent, ResourceGroup)


class ItemsAttr(SAttribute, apitype=True):
    def get(self, srlzr) -> Dict[str, str]:
        return srlzr.obj.val

    def set(self, srlzr, value: Dict[str, str], *, create: bool):
        srlzr.obj.val = value


class LookupTableSerializer(Serializer, apitype=True):
    identity = LookupTable.identity
    resclass = LookupTable

    items = ItemsAttr(read=ResourceScope.read, write=ResourceScope.update)
