# -*- coding: utf-8 -*-
from __future__ import division, absolute_import, print_function, unicode_literals

import zope.interface
from zope.interface import implements

__all__ = [
    'IResourceBase',
    'IResourceEstimateStorage',
    'implements',
    'providedBy',
]


class IResourceBase(zope.interface.Interface):
    pass


class IResourceEstimateStorage(IResourceBase):
    pass


def providedBy(obj):
    for i in zope.interface.providedBy(obj):
        if issubclass(i, IResourceBase) and i != IResourceBase:
            yield i
