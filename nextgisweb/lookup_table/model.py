from typing import Dict

import sqlalchemy as sa
import sqlalchemy.dialects.postgresql as sa_pg
from sqlalchemy.ext.mutable import MutableDict

from nextgisweb.env import Base, gettext

from nextgisweb.resource import Resource, ResourceGroup, ResourceScope, SAttribute, Serializer

Base.depends_on("resource")


class LookupTable(Base, Resource):
    identity = "lookup_table"
    cls_display_name = gettext("Lookup table")

    val = sa.Column(MutableDict.as_mutable(sa_pg.HSTORE))

    @classmethod
    def check_parent(cls, parent):
        return isinstance(parent, ResourceGroup)


class ItemsAttr(SAttribute):
    def get(self, srlzr) -> Dict[str, str]:
        return srlzr.obj.val

    def set(self, srlzr, value: Dict[str, str], *, create: bool):
        srlzr.obj.val = value


class LookupTableSerializer(Serializer, resource=LookupTable):
    items = ItemsAttr(read=ResourceScope.read, write=ResourceScope.update)
