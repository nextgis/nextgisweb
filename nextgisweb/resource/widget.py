# -*- coding: utf-8 -*-
from __future__ import unicode_literals
from collections import OrderedDict

from .model import Resource
import six

__all__ = ['Widget', ]

_registry = []


class WidgetMeta(type):
    def __init__(cls, name, bases, nmspc):
        super(WidgetMeta, cls).__init__(name, bases, nmspc)
        if not nmspc.get('__abstract__', False):
            _registry.append(cls)


class WidgetBase(object):

    def __init__(self, operation, obj, request):
        self.operation = operation
        self.obj = obj
        self.request = request


class Widget(six.with_metaclass(WidgetMeta, WidgetBase)):
    __abstract__ = True

    def is_applicable(self):
        operation = self.operation in self.__class__.operation
        resclass = not hasattr(self.__class__, 'resource') \
            or isinstance(self.obj, self.__class__.resource)
        interface = not hasattr(self.__class__, 'interface') \
            or self.__class__.interface.providedBy(self.obj)
        return operation and resclass and interface

    def config(self):
        return OrderedDict()


class CompositeWidget(WidgetBase):

    def __init__(self, *args, **kwargs):
        super(CompositeWidget, self).__init__(*args, **kwargs)
        self.members = []
        for mcls in _registry:
            member = mcls(*args, **kwargs)
            if member.is_applicable():
                self.members.append(member)

    def config(self):
        result = OrderedDict()
        for m in self.members:
            result[m.amdmod] = m.config()
        return result


class ResourceWidget(Widget):
    resource = Resource
    operation = ('create', 'update')
    amdmod = 'ngw-resource/Widget'


class ResourcePermissionWidget(Widget):
    resource = Resource
    operation = ('update', )
    amdmod = 'ngw-resource/PermissionWidget'


class ResourceDescriptionWiget(Widget):
    resource = Resource
    operation = ('create', 'update')
    amdmod = 'ngw-resource/DescriptionWidget'


class ResourceDeleteWidget(Widget):
    resource = Resource
    operation = ('delete', )
    amdmod = 'ngw-resource/DeleteWidget'
