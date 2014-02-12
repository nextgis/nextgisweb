# -*- coding: utf-8 -*-
from __future__ import unicode_literals

import zope.interface
from zope.interface import implements

__all__ = [
    'IResourceInterface',
    'implements',
    'providedBy',
]


class IResourceInterface(zope.interface.Interface):
    pass


def providedBy(obj):
    for i in zope.interface.providedBy(obj):
        if issubclass(i, IResourceInterface) and i != IResourceInterface:
            yield i
