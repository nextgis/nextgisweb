# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from ..registry import registry_maker


class SerializerBase(object):
    registry = registry_maker()

    def __init__(self, obj, user):
        self.obj = obj
        self.user = user

    def is_applicable(self):
        pass

    def serialize(self):
        pass

    def deserialize(self, data):
        pass

    def has_permission(self, cls, permission):
        return self.obj.has_permission(cls, permission, self.user)


class CompositeSerializer(SerializerBase):

    def __init__(self, obj, user):
        super(CompositeSerializer, self).__init__(obj, user)
        self.members = dict()
        for ident, mcls in self.registry._dict.iteritems():
            mobj = mcls(obj, user)
            if mobj.is_applicable():
                self.members[ident] = mobj

    def serialize(self):
        result = dict()

        for ident, mobj in self.members.iteritems():
            result[ident] = mobj.serialize()

        return result

    def deserialize(self, data):
        for ident, mobj in self.members.iteritems():
            if ident in data:
                mobj.deserialize(data[ident])
