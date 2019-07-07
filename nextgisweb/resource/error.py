# -*- coding: utf-8 -*-
from __future__ import division, absolute_import, print_function, unicode_literals

import zope.interface

from ..error import IErrorInfo

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


class ResourceError(Exception):
    """ Base class for resource exceptions """

    zope.interface.implements(IErrorInfo)

    def __init__(self, message, data=None):
        self.message = message
        self.data = data if data is not None else dict()


class ResourceNotFound(Exception):
    zope.interface.implements(IErrorInfo)

    title = _("Resource not found")
    message = _("Resource with id = %d was not found.")
    detail = _(
        "The resource may have been deleted or an error in the URL. Correct "
        "the URL or go to the home page and try to find the desired resource.")
    http_status_code = 404

    def __init__(self, resource_id):
        self.message = self.__class__.message % resource_id
        self.data = dict(resource_id=resource_id)
        super(ResourceNotFound, self).__init__(self.message)


class DisplayNameNotUnique(Exception):
    zope.interface.implements(IErrorInfo)

    title = _("Resource display name is not unique")
    message = _("Resource with same display name already exists (id = %d).")
    detail = _(
        "Within a single parent resource, each resource must have unique display "
        "name. Give the resource a different display name or rename existing.")
    http_status_code = 422

    def __init__(self, resource_id):
        self.message = self.__class__.message % resource_id
        self.data = dict(resource_id=resource_id)
        super(DisplayNameNotUnique, self).__init__(self.message)


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
