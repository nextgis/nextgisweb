# -*- coding: utf-8 -*-
from __future__ import division, absolute_import, print_function, unicode_literals
import sys
import warnings
import traceback
import json
from collections import OrderedDict

from pyramid.response import Response

from ..error import IErrorInfo


def tween_factory(handler, registry):
    is_api = registry.settings.get('error_info.request_filter', lambda request: True)

    def error_info_tween(request):
        try:
            return handler(request)
        except Exception as exc:
            # Keep original exception context
            exc_info = sys.exc_info()

            try:
                err_info = IErrorInfo(exc)
            except TypeError:
                err_info = None

            if err_info is not None and is_api(request):
                return error_info_response(
                    request, exc, exc_info, err_info)
            else:
                # Reraise exception with original context
                raise exc_info[0], exc_info[1], exc_info[2]

    return error_info_tween


def error_info_response(request, exc, exc_info, err_info, debug=True):
    exc_module = exc.__class__.__module__
    if exc_module is None or exc_module == str.__class__.__module__:
        return exc.__class__.__name__
    exc_full_name = exc_module + '.' + exc.__class__.__name__

    def ei_attr(attr, default=None):
        try:
            return getattr(err_info, attr)
        except AttributeError:
            warnings.warn("Exception {} doesn't provide attribute: {}".format(
                exc_full_name, attr))
            return default

    status_code = ei_attr('http_status_code', 500)

    result = OrderedDict((
        # TODO: Add localization
        ('message', ei_attr('message')),
        ('exception', exc_full_name),
        ('status_code', status_code),
    ))

    data = ei_attr('data')
    if data is not None:
        result['data'] = data

    if debug:
        result['traceback'] = map(
            lambda itm: OrderedDict(zip(('file_name', 'line_number', 'function', 'text'), itm)),
            traceback.extract_tb(exc_info[2]))

    return Response(
        json.dumps(result), content_type=b'application/json',
        status_code=status_code,
    )
