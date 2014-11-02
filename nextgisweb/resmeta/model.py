# -*- coding: utf-8 -*-
from __future__ import unicode_literals


from .. import db
from ..models import declarative_base
from ..resource import (
    Resource,
    MetadataScope,
    Serializer,
    SerializedProperty)

from .ident import COMP_ID


Base = declarative_base()


class ResourceMetadataItem(Base):
    __tablename__ = '%s_item' % COMP_ID

    resource_id = db.Column(db.ForeignKey(Resource.id), primary_key=True)
    keyname = db.Column(db.Unicode(255), primary_key=True)
    vinteger = db.Column(db.Integer)
    vfloat = db.Column(db.Float)
    vtext = db.Column(db.Unicode)

    resource = db.relationship(Resource, backref=db.backref(COMP_ID))

    @property
    def value(self):
        if self.vinteger is not None:
            return self.vinteger
        elif self.vfloat is not None:
            return self.vfloat
        elif self.vtext is not None:
            return self.vtext
        else:
            return None

    @value.setter
    def value(self, value):
        self.vinteger = value if isinstance(value, int) else None
        self.vfloat = value if isinstance(value, float) else None
        self.vtext = value if isinstance(value, basestring) else None


class _items_attr(SerializedProperty):

    def getter(self, srlzr):
        result = dict()

        for itm in getattr(srlzr.obj, COMP_ID):
            result[itm.keyname] = itm.value

        return result

    def setter(self, srlzr, value):
        if value is not None:
            for k, val in value.iteritems():
                itm = ResourceMetadataItem(keyname=k)
                itm.value = val
                getattr(srlzr.obj, COMP_ID).append(itm)


class ResourceMetadataSerializer(Serializer):
    identity = COMP_ID
    resclass = Resource

    items = _items_attr(read=MetadataScope.read, write=MetadataScope.write)
