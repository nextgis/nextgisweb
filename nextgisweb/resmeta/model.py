# -*- coding: utf-8 -*-
from __future__ import unicode_literals


from .. import db
from ..models import declarative_base
from ..resource import (
    Resource,
    MetadataScope,
    Serializer,
    SerializedProperty)

from .util import COMP_ID
import six


Base = declarative_base()


class ResourceMetadataItem(Base):
    __tablename__ = '%s_item' % COMP_ID

    resource_id = db.Column(db.ForeignKey(Resource.id), primary_key=True)
    key = db.Column(db.Unicode(255), primary_key=True)

    vinteger = db.Column(db.Integer)
    vfloat = db.Column(db.Float)
    vtext = db.Column(db.Unicode)

    resource = db.relationship(Resource, backref=db.backref(
        COMP_ID, cascade='all, delete-orphan'))

    def tval(self):
        if self.vinteger is not None:
            return ('integer', self.vinteger)
        elif self.vfloat is not None:
            return ('float', self.vfloat)
        elif self.vtext is not None:
            return ('text', self.vtext)
        else:
            return (None, None)

    @property
    def vtype(self):
        return self.tval()[0]

    @property
    def value(self):
        return self.tval()[1]

    @value.setter
    def value(self, value):
        self.vinteger = value if isinstance(value, int) else None
        self.vfloat = value if isinstance(value, float) else None
        self.vtext = value if isinstance(value, six.string_types) else None


class _items_attr(SerializedProperty):

    def getter(self, srlzr):
        result = dict()

        for itm in getattr(srlzr.obj, COMP_ID):
            result[itm.key] = itm.value

        return result

    def setter(self, srlzr, value):
        odata = getattr(srlzr.obj, COMP_ID)

        rml = []        # Records to be removed
        imap = dict()   # Records to be rewritten

        for i in odata:
            if i.key in value and value[i.key] is not None:
                imap[i.key] = i
            else:
                rml.append(i)

        # Remove records to be removed
        map(lambda i: odata.remove(i), rml)

        for k, val in value.items():
            if val is None:
                continue

            itm = imap.get(k)

            if itm is None:
                # Create new record if there is no record to rewrite
                itm = ResourceMetadataItem(key=k)
                odata.append(itm)

            itm.value = val


class ResourceMetadataSerializer(Serializer):
    identity = COMP_ID
    resclass = Resource

    # TODO: It would be possible nice to implement serialization
    # without intermediate items key, but this is impossible right now
    # as serialization as a whole and serialization of attributes are mixed in one class.

    items = _items_attr(read=MetadataScope.read, write=MetadataScope.write)
