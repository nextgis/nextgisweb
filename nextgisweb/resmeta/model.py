from nextgisweb.env import COMP_ID, Base, _
from nextgisweb.lib import db

from nextgisweb.resource import Resource, ResourceScope, SerializedProperty, Serializer

Base.depends_on("resource")


class ResourceMetadataItem(Base):
    __tablename__ = "%s_item" % COMP_ID

    resource_id = db.Column(db.ForeignKey(Resource.id), primary_key=True)
    key = db.Column(db.Unicode(255), primary_key=True)

    vinteger = db.Column(db.Integer)
    vfloat = db.Column(db.Float)
    vtext = db.Column(db.Unicode)
    vboolean = db.Column(db.Boolean)

    resource = db.relationship(Resource, backref=db.backref(COMP_ID, cascade="all, delete-orphan"))

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
    "string": _("String"),
    "number": _("Number"),
    "boolean": _("Boolean"),
    "null": _("Empty"),
}


class _items_attr(SerializedProperty):
    def getter(self, srlzr):
        result = dict()

        for itm in getattr(srlzr.obj, COMP_ID):
            result[itm.key] = itm.value

        return result

    def setter(self, srlzr, value):
        odata = getattr(srlzr.obj, COMP_ID)

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


class ResmetaSerializer(Serializer):
    identity = COMP_ID
    resclass = Resource

    # TODO: It would be possible nice to implement serialization
    # without intermediate items key, but this is impossible right now
    # as serialization as a whole and serialization of attributes are mixed in one class.

    items = _items_attr(read=ResourceScope.read, write=ResourceScope.update)
