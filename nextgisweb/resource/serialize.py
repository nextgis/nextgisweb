# -*- coding: utf-8 -*-
from __future__ import unicode_literals
import sys
from collections import OrderedDict
import six

from zope.interface import Interface, implementer

from ..registry import registry_maker
from ..models import BaseClass
from ..core.exception import IUserException

from .exception import ForbiddenError
from .util import _

_registry = registry_maker()


class SerializerBase(object):

    def __init__(self, obj, user, data=None):
        self.obj = obj
        self.user = user

        if data is None:
            self.data = OrderedDict()
            self.keys = None
        else:
            self.data = data
            self.keys = set()

    def is_applicable(self):
        pass

    def serialize(self):
        pass

    def deserialize(self):
        pass

    def mark(self, *keys):
        self.keys.update(keys)

    def has_permission(self, permission):
        return self.obj.has_permission(permission, self.user)


class ISerializedAttribute(Interface):

    def bind(self, srlzrcls, attrname):
        pass

    def serialize(self, srlzr):
        pass

    def deserialize(self, srlzr):
        pass


@implementer(ISerializedAttribute)
class SerializedProperty(object):

    def __init__(self, read=None, write=None, scope=None, depth=1):
        self.read = read
        self.write = write
        self.scope = scope

        self.srlzrcls = None
        self.attrname = None

        self.__order__ = len(sys._getframe(depth).f_locals)

    def bind(self, srlzrcls, attrname):
        self.srlzrcls = srlzrcls
        self.attrname = attrname

        if not self.scope:
            self.scope = self.srlzrcls.resclass

    def readperm(self, srlzr):
        return self.read and srlzr.has_permission(self.read)

    def writeperm(self, srlzr):
        return self.write and srlzr.has_permission(self.write)

    def getter(self, srlzr):
        return getattr(srlzr.obj, self.attrname)

    def setter(self, srlzr, value):
        setattr(srlzr.obj, self.attrname, value)

    def serialize(self, srlzr):
        if self.readperm(srlzr):
            srlzr.data[self.attrname] = self.getter(srlzr)

    def deserialize(self, srlzr):
        if self.writeperm(srlzr):
            self.setter(srlzr, srlzr.data[self.attrname])
        else:
            raise ForbiddenError(_("Attribute '%s' forbidden.") % self.attrname)


class SerializedRelationship(SerializedProperty):

    def __init__(self, depth=1, **kwargs):
        super(SerializedRelationship, self).__init__(depth=depth + 1, **kwargs)

    def bind(self, srlzrcls, prop):
        super(SerializedRelationship, self).bind(srlzrcls, prop)
        self.relationship = srlzrcls.resclass.__mapper__ \
            .relationships[self.attrname]

    def getter(self, srlzr):
        value = super(SerializedRelationship, self).getter(srlzr)
        return dict(map(
            lambda k: (k.name, serval(getattr(value, k.name))),
            value.__mapper__.primary_key)) if value else None

    def setter(self, srlzr, value):
        mapper = self.relationship.mapper
        cls = mapper.class_

        if value is not None:
            obj = cls.filter_by(**dict(map(
                lambda k: (k.name, value[k.name]),
                mapper.primary_key))
            ).one()
        else:
            obj = None

        setattr(srlzr.obj, self.attrname, obj)


class SerializedResourceRelationship(SerializedRelationship):

    def getter(self, srlzr):
        value = SerializedProperty.getter(self, srlzr)
        return OrderedDict((
            ('id', value.id), ('parent', dict(id=value.parent_id))
        )) if value else None


class SerializerMeta(type):

    def __init__(cls, name, bases, nmspc):
        super(SerializerMeta, cls).__init__(name, bases, nmspc)

        proptab = []
        for prop, sp in six.iteritems(nmspc):
            if ISerializedAttribute.providedBy(sp):
                sp.bind(cls, prop)
                proptab.append((prop, sp))

        cls.proptab = sorted(proptab, key=lambda x: getattr(x[1], '__order__', 65535))

        if not nmspc.get('__abstract__', False):
            _registry.register(cls)


class Serializer(six.with_metaclass(SerializerMeta, SerializerBase)):
    registry = _registry

    resclass = None

    def is_applicable(self):
        return self.resclass and isinstance(self.obj, self.resclass)

    def serialize(self):
        for prop, sp in self.proptab:
            sp.serialize(self)

    def deserialize(self):
        for prop, sp in self.proptab:
            if prop in self.data and prop not in self.keys:
                try:
                    sp.deserialize(self)
                except Exception as exc:
                    exc_info = sys.exc_info()
                    self.annotate_exception(exc, sp)
                    six.reraise(exc_info[0], exc_info[1], exc_info[2])

    def annotate_exception(self, exc, sp):
        exc.__srlzr_prprt__ = sp.attrname

        try:
            error_info = IUserException(exc)
            error_info.data['attribute'] = sp.attrname
        except TypeError:
            pass


class CompositeSerializer(SerializerBase):
    registry = _registry

    def __init__(self, obj, user, data=None):
        super(CompositeSerializer, self).__init__(obj, user, data)

        self.members = OrderedDict()
        for ident, mcls in six.iteritems(self.registry._dict):
            if data is None or ident in data:
                mdata = data[ident] if data else None
                mobj = mcls(obj, user, mdata)
                if mobj.is_applicable():
                    self.members[ident] = mobj

    def serialize(self):
        for ident, mobj in six.iteritems(self.members):
            try:
                mobj.serialize()
                self.data[ident] = mobj.data
            except Exception as exc:
                exc_info = sys.exc_info()
                self.annotate_exception(exc, mobj)
                six.reraise(exc_info[0], exc_info[1], exc_info[2])

    def deserialize(self):
        for ident, mobj in six.iteritems(self.members):
            try:
                if ident in self.data:
                    mobj.deserialize()
            except Exception as exc:
                exc_info = sys.exc_info()
                self.annotate_exception(exc, mobj)
                six.reraise(exc_info[0], exc_info[1], exc_info[2])

    def annotate_exception(self, exc, mobj):
        """ Adds information about serializer that called the exception to the exception """

        exc.__srlzr_cls__ = mobj.__class__

        try:
            error_info = IUserException(exc)
            error_info.data['serializer'] = mobj.__class__.identity
        except TypeError:
            pass


def serval(value):
    if (
        value is None
        or isinstance(value, int)  # NOQA: W503
        or isinstance(value, float)  # NOQA: W503
        or isinstance(value, six.string_types)  # NOQA: W503
    ):
        return value

    elif isinstance(value, dict):
        return dict(map(
            lambda k, v: (serval(k), serval(v)),
            six.iteritems(value)))

    elif isinstance(value, BaseClass):
        return dict(map(
            lambda k: (k.name, serval(getattr(value, k.name))),
            value.__mapper__.primary_key))

    elif hasattr(value, '__iter__'):
        return map(serval, value)

    else:
        raise NotImplementedError()
