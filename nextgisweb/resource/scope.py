# -*- coding: utf-8 -*-
from __future__ import unicode_literals


def scopeid(o):
    if hasattr(o, 'identity'):
        return o.identity
    elif hasattr(o, 'scope'):
        return o.scope


def clscopes(cls):
    for c in cls.__mro__:
        if hasattr(c, 'identity') or hasattr(c, 'scope'):
            yield c
