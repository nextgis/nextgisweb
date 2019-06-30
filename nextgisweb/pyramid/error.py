# -*- coding: utf-8 -*-
from __future__ import division, absolute_import, print_function, unicode_literals
import sys
import warnings
import traceback
import json
from collections import OrderedDict

from pyramid.renderers import render_to_response
from pyramid.response import Response
from pyramid.compat import reraise

from ..error import IErrorInfo


def tween_factory(handler, registry):
    error_handler = registry.settings.get('error.handler')

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

            if err_info is not None and error_handler is not None:
                error_response = error_handler(request, err_info, exc, exc_info)
                if error_response is not None:
                    return error_response

            reraise(*exc_info)

    return error_info_tween


def json_error(request, err_info, exc, exc_info, debug=True):
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

    message = ei_attr('message')
    status_code = ei_attr('http_status_code', 500)

    result = OrderedDict((
        ('message', request.localizer.translate(message) if message else None),
        ('exception', exc_full_name),
        ('status_code', status_code),
    ))

    data = ei_attr('data')
    if data is not None:
        result['data'] = data

    if debug:
        result['traceback'] = map(
            lambda itm: OrderedDict(zip(('file', 'line', 'func', 'text'), itm)),
            traceback.extract_tb(exc_info[2]))

    return result


def json_error_response(request, err_info, exc, exc_info, debug=True):
    return Response(
        json.dumps(json_error(request, err_info, exc, exc_info, debug=debug)),
        content_type=b'application/json',
        status_code=err_info.http_status_code)


def html_error_response(request, err_info, exc, exc_info, debug=True):
    response = render_to_response(
        'nextgisweb:pyramid/template/error.mako',
        dict(
            err_info=err_info,
            exc=exc, exc_info=exc_info,
            debug=debug
        ),
        request=request)

    response.status = err_info.http_status_code
    return response
