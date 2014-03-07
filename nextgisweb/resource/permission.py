# -*- coding: utf-8 -*-
from __future__ import unicode_literals
from bunch import Bunch

__all__ = ['Permission', 'Scope']


class Requirement(object):

    def __init__(self, dst, src, attr=None, cls=None):
        self.dst = dst
        self.src = src
        self.attr = attr
        self.cls = cls


class Permission(object):

    # Счетчик для нумерации объектов, нужно для получения элементов,
    # в том виде, в котором они были созданы внутри класса.
    __create_order = 0

    def __init__(self, label=None, name=None, scope=None):
        self.label = label
        self.name = name
        self.scope = scope

        if not self.is_bound():
            self._requirements = list()

        Permission.__create_order += 1
        self._create_order = Permission.__create_order

    def __repr__(self):
        return "<Permission '%s' in scope '%s'>" % (
            self.name, self.scope.identity)

    def __unicode__(self):
        return unicode(self.label)

    def is_bound(self):
        return self.name is not None and self.scope is not None

    def bind(self, name=None, scope=None):
        self.name = name
        self.scope = scope
        self.scope.requirements.extend(self._requirements)
        del self._requirements

    def require(self, *args, **kwargs):
        tgt = self.scope.requirements \
            if self.is_bound() \
            else self._requirements

        tgt.append(Requirement(self, *args, **kwargs))

        return self


class ScopeMeta(type):

    def __init__(cls, classname, bases, nmspc):
        Scope = globals().get('Scope', None)

        assert Scope is None or 'identity' in cls.__dict__, \
            'Attribute identity not found in %s' % classname

        if Scope is not None:
            setattr(cls, 'requirements', list())

        for name, perm in cls.__dict__.iteritems():
            if not isinstance(perm, Permission):
                continue

            assert perm.name is None
            assert perm.scope is None

            perm.bind(name, cls)

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
