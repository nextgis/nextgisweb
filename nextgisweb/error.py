# -*- coding: utf-8 -*-
from __future__ import division, absolute_import, print_function, unicode_literals
from collections import namedtuple

from zope.interface import Interface, Attribute, implements, classImplements
from zope.interface.interface import adapter_hooks


class IErrorInfo(Interface):

    message = Attribute(
        """ User friendly and secure error message """)

    data = Attribute(
        """ Extended error specific JSON-serializable data """)

    http_status_code = Attribute(
        """ Corresponding HTTP 4xx or 5xx status code """)


ErrorInfo = namedtuple('ErrorInfo', ['message', 'http_status_code', 'data'])
classImplements(ErrorInfo, IErrorInfo)


def provide_error_info(exc, message=None, http_status_code=None, data=None):
    exc.__error_info__ = ErrorInfo(
        message=message, data=data,
        http_status_code=http_status_code)
    return exc


@adapter_hooks.append
def adapt_exception_to_error_info(iface, obj):
    if isinstance(obj, Exception) and issubclass(iface, IErrorInfo):
        if hasattr(obj, '__error_info__'):
            return obj.__error_info__


class ValidationError(Exception):
    implements(IErrorInfo)
    http_status_code = 422

    def __init__(self, message, data=None):
        self.message = message
        self.data = data
