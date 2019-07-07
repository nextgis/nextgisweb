# -*- coding: utf-8 -*-
from __future__ import division, absolute_import, print_function, unicode_literals
from collections import namedtuple

from zope.interface import Interface, Attribute, implements, classImplements
from zope.interface.interface import adapter_hooks


class IUserException(Interface):

    title = Attribute("General error description")
    message = Attribute("User friendly and secure message describing error")
    detail = Attribute("Information about fixing problem in Web GIS context")
    http_status_code = Attribute("Corresponding HTTP 4xx or 5xx status code")

    data = Attribute("Error specific JSON-serializable dictionary")


UserException = namedtuple('UserException', [
    'title', 'message', 'detail', 'http_status_code', 'data'])

classImplements(UserException, IUserException)


def user_exception(
    exc, title=None, message=None, detail=None,
    http_status_code=None, data=None
):
    exc.__user_exception__ = UserException(
        title=title, message=message, detail=detail,
        http_status_code=http_status_code,
        data=data if data else dict())
    return exc


@adapter_hooks.append
def adapt_exception_to_user_exception(iface, obj):
    if isinstance(obj, Exception) and issubclass(iface, IUserException):
        if hasattr(obj, '__user_exception__'):
            return obj.__user_exception__


class ValidationError(Exception):
    implements(IUserException)

    title = "Validation error"
    http_status_code = 422

    def __init__(self, message, title=None, http_status_code=None, data=None):
        self.message = message
        self.data = data if data else dict()

        if title is not None:
            self.title = title
        if http_status_code is not None:
            self.http_status_code = 422
