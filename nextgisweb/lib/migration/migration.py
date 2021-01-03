# -*- coding: utf-8 -*-
from __future__ import division, unicode_literals, print_function, absolute_import
import re
from collections import namedtuple

from .revision import REVID_ZERO

MigrationKey = namedtuple('MigrationKey', ('component', 'revision'))
MigrationKey.__repr__ = lambda self: "<{}:{}>".format(*self)
MigrationKey.__str__ = lambda self: "{}:{}".format(*self)


class Migration(object):

    def __init__(self, component, revision):
        self._component = component
        self._revision = revision
        self._parents = None
        self._date = None
        self._message = None
        self._dependencies = None
        self._has_forward = None
        self._has_rewind = None

    @property
    def key(self):
        return MigrationKey(self._component, self._revision)

    @property
    def component(self):
        return self._component

    @property
    def revision(self):
        return self._revision

    @property
    def parents(self):
        assert self._parents is not None, "Attribute _parents is not set!"
        return self._parents

    @property
    def dependencies(self):
        assert self._dependencies is not None, "Attribute _dependencies is not set!"
        return self._dependencies

    @property
    def has_forward(self):
        assert self._has_forward is not None, "Attribute _has_forward is not set!"
        return self._has_forward

    @property
    def has_rewind(self):
        assert self._has_rewind is not None, "Attribute _has_rewind is not set!"
        return self._has_rewind


class InitialMigration(Migration):

    def __init__(self, component):
        super(InitialMigration, self).__init__(component, REVID_ZERO)
        self._parents = ()
        self._message = 'Initial migration'
        self._dependencies = ()
        self._has_forward = False
        self._has_rewind = False


class Dependency(object):

    def __init__(self, value):
        m = re.match(r'^(.+)(==|[\>\<]=?)(.+)$', value)
        if m:
            self._component = m.group(1)
            self._operation = m.group(2)
            self._revision = m.group(3)
        else:
            raise ValueError("Invalid dependency: {}".format(value))

    @property
    def component(self):
        return self._component

    @property
    def operation(self):
        return self._operation

    @property
    def revision(self):
        return self._revision
