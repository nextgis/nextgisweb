# -*- coding: utf-8 -*-
from __future__ import division, absolute_import, print_function, unicode_literals
from collections import namedtuple

from zope.interface import Interface, Attribute, implements, classImplements
from zope.interface.interface import adapter_hooks


class IErrorInfo(Interface):

    title = Attribute("General error description")
    message = Attribute("User friendly and secure message describing error")
    http_status_code = Attribute("Corresponding HTTP 4xx or 5xx status code")

    data = Attribute("Error specific JSON-serializable dictionary")


ErrorInfo = namedtuple('ErrorInfo', ['title', 'message', 'http_status_code', 'data'])
classImplements(ErrorInfo, IErrorInfo)


def provide_error_info(exc, title=None, message=None, http_status_code=None, data=None):
    exc.__error_info__ = ErrorInfo(
        title=title, message=message,
        http_status_code=http_status_code,
        data=data if data else dict())
    return exc


@adapter_hooks.append
def adapt_exception_to_error_info(iface, obj):
    if isinstance(obj, Exception) and issubclass(iface, IErrorInfo):
        if hasattr(obj, '__error_info__'):
            return obj.__error_info__


class ValidationError(Exception):
    implements(IErrorInfo)

    title = "Validation error"
    http_status_code = 422

    def __init__(self, message, title=None, http_status_code=None, data=None):
        self.message = message
        self.data = data if data else dict()

        if title is not None:
            self.title = title
        if http_status_code is not None:
            self.http_status_code = 422
