# -*- coding: utf-8 -*-
from __future__ import unicode_literals

__all__ = [
    'ResourceError',
    'ForbiddenError',
    'ValidationError',
    'OperationalError',
    'Forbidden',
]


class ResourceError(Exception):
    """ Base class for resource exceptions """


class ForbiddenError(ResourceError):
    pass


class ValidationError(ResourceError):
    """ Exception raised by incorrect data 
    from user or external service """


class OperationalError(ResourceError):
    """ Exception raised by incorrect system
    behavior, 'something went wrong' """


Forbidden = ForbiddenError  # TODO: Depricate
