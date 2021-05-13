# -*- coding: utf-8 -*-
from __future__ import division, absolute_import, print_function, unicode_literals

import six

from ..registry import registry_maker

__all__ = ['KindOfData', ]


class KindOfDataMeta(type):

    def __init__(cls, name, bases, nmspc):
        super(KindOfDataMeta, cls).__init__(name, bases, nmspc)
        if cls.identity is not None:
            cls.registry.register(cls)


class KindOfData(six.with_metaclass(KindOfDataMeta)):

    registry = registry_maker()

    identity = None
    display_name = None
