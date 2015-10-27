# -*- coding: utf-8 -*-
from __future__ import unicode_literals, print_function, absolute_import
import warnings
from collections import OrderedDict


def registry_maker():
    class ClassRegistry(object):

        def __init__(self):
            self._items = []
            self._dict = OrderedDict()

        def register(self, cls):
            if cls in self._items:
                warnings.warn(
                    "Class registered multiple times: %s" % cls.__name__,
                    stacklevel=2)
                return cls
            self._items.append(cls)
            if hasattr(cls, 'identity'):
                self._dict[cls.identity] = cls
            return cls

        def __iter__(self):
            for i in self._items:
                yield i

        def __getitem__(self, identity):
            return self._dict[identity]

        def __contains__(self, identity):
            return self._dict.__contains__(identity)

        def get(self, identity, default=None):
            return self._dict.get(identity, default)

    return ClassRegistry()
