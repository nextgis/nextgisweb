from typing import Dict, Union

import sqlalchemy as sa
import sqlalchemy.orm as orm
from msgspec import Meta
from typing_extensions import Annotated

from nextgisweb.env import Base, gettext

from nextgisweb.resource import Resource, ResourceScope, SAttribute, Serializer

Base.depends_on("resource")


class ResourceMetadataItem(Base):
    __tablename__ = "resmeta_item"

    resource_id = sa.Column(sa.ForeignKey(Resource.id), primary_key=True)
    key = sa.Column(sa.Unicode(255), primary_key=True)

    vinteger = sa.Column(sa.Integer)
    vfloat = sa.Column(sa.Float)
    vtext = sa.Column(sa.Unicode)
    vboolean = sa.Column(sa.Boolean)

    resource = orm.relationship(
        Resource,
        backref=orm.backref("resmeta", cascade="all, delete-orphan"),
    )

    def tval(self):
        if self.vinteger is not None:
            return ("number", self.vinteger)
        elif self.vfloat is not None:
            return ("number", self.vfloat)
        elif self.vtext is not None:
            return ("string", self.vtext)
        elif self.vboolean is not None:
            return ("boolean", self.vboolean)
        else:
            return ("null", None)

    @property
    def vtype(self):
        return self.tval()[0]

    @property
    def value(self):
        return self.tval()[1]

    @value.setter
    def value(self, value):
        self.vinteger = value if isinstance(value, int) and not isinstance(value, bool) else None
        self.vfloat = value if isinstance(value, float) else None
        self.vtext = value if isinstance(value, str) else None
        self.vboolean = value if isinstance(value, bool) else None


VTYPE_DISPLAY_NAME = {
    "string": gettext("String"),
    "number": gettext("Number"),
    "boolean": gettext("Boolean"),
    "null": gettext("Empty"),
}

ItemKey = Annotated[str, Meta(max_length=255)]
ItemsType = Dict[ItemKey, Union[str, int, bool, float, None]]


class ItemsAttr(SAttribute, apitype=True):
    def get(self, srlzr) -> ItemsType:
        return {itm.key: itm.value for itm in srlzr.obj.resmeta}

    def set(self, srlzr, value: ItemsType, *, create: bool):
        odata = srlzr.obj.resmeta

        rml = []  # Records to be removed
        imap = dict()  # Records to be rewritten

        for i in odata:
            if i.key in value:
                imap[i.key] = i
            else:
                rml.append(i)

        # Remove records to be removed
        for i in rml:
            odata.remove(i)

        for k, val in value.items():
            itm = imap.get(k)

            if itm is None:
                # Create new record if there is no record to rewrite
                itm = ResourceMetadataItem(key=k)
                odata.append(itm)

            itm.value = val


class ResmetaSerializer(Serializer, apitype=True):
    identity = "resmeta"
    resclass = Resource

    # TODO: It would be possible nice to implement serialization
    # without intermediate items key, but this is impossible right now
    # as serialization as a whole and serialization of attributes are mixed in one class.

    items = ItemsAttr(read=ResourceScope.read, write=ResourceScope.update)
