# -*- coding: utf-8 -*-
from __future__ import division, absolute_import, print_function, unicode_literals
import six

if six.PY3:
    from functools import lru_cache
else:
    from backports.functools_lru_cache import lru_cache

__all__ = [
    'lru_cache',
]
