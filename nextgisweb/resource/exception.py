# -*- coding: utf-8 -*-
from __future__ import division, absolute_import, print_function, unicode_literals
import warnings

from zope.interface import implementer

from ..core.exception import (
    IUserException,
    UserException,
    ValidationError)

from .util import _


__all__ = [
    'ResourceError',
    'ResourceNotFound',
    'DisplayNameNotUnique',
    'ForbiddenError',
    'ValidationError',
    'HierarchyError',
    'OperationalError',
]


class ResourceNotFound(UserException):
    title = _("Resource not found")
    message = _("Resource with id = %d was not found.")
    detail = _(
        "The resource may have been deleted or an error in the address. Correct "
        "the address or go to the home page and try to find the desired resource.")
    http_status_code = 404

    def __init__(self, resource_id):
        super(ResourceNotFound, self).__init__(
            message=self.__class__.message % resource_id,
            data=dict(resource_id=resource_id))


class DisplayNameNotUnique(ValidationError):
    title = _("Resource display name is not unique")
    message = _("Resource with same display name already exists (id = %d).")
    detail = _(
        "Within a single parent resource, each resource must have unique display "
        "name. Give the resource a different display name or rename existing.")

    def __init__(self, resource_id):
        super(DisplayNameNotUnique, self).__init__(
            message=self.__class__.message % resource_id,
            data=dict(resource_id=resource_id))


# TODO: Rewrite old-style resource exception classes

@implementer(IUserException)
class ResourceError(Exception):
    """ Base class for resource exceptions """

    def __init__(self, message, data=None):
        warnings.warn("{} is deprecated!".format(self.__class__.__name__), DeprecationWarning)
        self.message = message
        self.data = data if data is not None else dict()


class ForbiddenError(ResourceError):
    title = _("Forbidden")
    http_status_code = 403


class ValidationError(ResourceError):
    """ Exception raised by incorrect data
    from user or external service """

    title = _("Validation error")
    http_status_code = 422


class HierarchyError(ValidationError):
    title = _("Hierarchy error")


class OperationalError(ResourceError):
    """ Exception raised by incorrect system
    behavior, 'something went wrong' """

    title = _("Operational error")
    http_status_code = 503


Forbidden = ForbiddenError  # TODO: Depricate
