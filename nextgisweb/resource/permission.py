# -*- coding: utf-8 -*-
from __future__ import unicode_literals
from bunch import Bunch

__all__ = ['Permission', 'Scope']


class Permission(object):

    # Счетчик для нумерации объектов, нужно для получения элементов,
    # в том виде, в котором они были созданы внутри класса.
    __create_order = 0

    def __init__(self, label=None, name=None, scope=None):
        self.label = label
        self.name = name
        self.scope = scope

        Permission.__create_order += 1
        self._create_order = Permission.__create_order

    def __repr__(self):
        return "<Permission '%s' in scope '%s'>" % (
            self.name, self.scope.identity)

    def __unicode__(self):
        return unicode(self.label)


class ScopeMeta(type):

    def __init__(cls, classname, bases, nmspc):
        Scope = globals().get('Scope', None)

        assert Scope is None or 'identity' in cls.__dict__, \
            'Attribute identity not found in %s' % classname

        for name, perm in cls.__dict__.iteritems():
            if not isinstance(perm, Permission):
                continue

            assert perm.name is None
            assert perm.scope is None

            perm.name = name
            perm.scope = cls

        super(ScopeMeta, cls).__init__(classname, bases, nmspc)

        if Scope is not None:
            cls.registry[cls.__dict__['identity']] = cls

    __registry = Bunch()

    @property
    def registry(cls):
        return cls.__registry

    def itervalues(cls, ordered=False):
        if ordered:
            f = lambda a: sorted(a, key=lambda i: i._create_order)
        else:
            f = lambda a: a

        for v in f(filter(
            lambda v: isinstance(v, Permission),
            cls.__dict__.itervalues()
        )):
            yield v


class Scope(object):
    __metaclass__ = ScopeMeta
