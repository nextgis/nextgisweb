# -*- coding: utf-8 -*-
from __future__ import unicode_literals

__all__ = [
    'ResourceError',
    'Forbidden',
    'ValidationError',
]


class ResourceError(Exception):
    pass


class Forbidden(ResourceError):
    pass


class ValidationError(ResourceError):
    pass
