# -*- coding: utf-8 -*-
from __future__ import division, absolute_import, print_function, unicode_literals

import zope.interface

from ..error import IErrorInfo


__all__ = [
    'ResourceError',
    'ForbiddenError',
    'ValidationError',
    'OperationalError',
    'Forbidden',
]


class ResourceError(Exception):
    """ Base class for resource exceptions """

    zope.interface.implements(IErrorInfo)

    def __init__(self, message, data=None):
        self.message = message
        self.data = data if data is not None else dict()


class ForbiddenError(ResourceError):

    http_status_code = 403


class ValidationError(ResourceError):
    """ Exception raised by incorrect data
    from user or external service """

    http_status_code = 422


class OperationalError(ResourceError):
    """ Exception raised by incorrect system
    behavior, 'something went wrong' """

    http_status_code = 503


Forbidden = ForbiddenError  # TODO: Depricate
