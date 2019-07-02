# -*- coding: utf-8 -*-
from __future__ import division, absolute_import, print_function, unicode_literals
import sys
import os.path
import warnings
import traceback
import json
import logging
from collections import OrderedDict
from hashlib import md5

from pyramid.renderers import render_to_response
from pyramid.response import Response
from pyramid.compat import reraise
from pyramid import httpexceptions
from zope.interface import implements
from zope.interface.interface import adapter_hooks

from ..error import IErrorInfo, provide_error_info
from .util import _


_logger = logging.getLogger(__name__)


def includeme(config):
    TM_TFACTORY = 'pyramid_tm.tm_tween_factory'
    DT_TFACTORY = 'pyramid_debugtoolbar.toolbar_tween_factory'

    ERR_TFACTORY = 'nextgisweb.pyramid.error.error_tween_factory'
    EXC_TFACTORY = 'nextgisweb.pyramid.error.exception_tween_factory'

    config.add_tween(ERR_TFACTORY, over=(TM_TFACTORY, 'MAIN'), under=(DT_TFACTORY, 'INGRESS'))
    config.add_tween(EXC_TFACTORY, over=(DT_TFACTORY, ERR_TFACTORY))


def error_tween_factory(handler, registry):
    err_response = registry.settings['error.err_response']

    def error_tween(request):
        try:
            response = handler(request)

            if isinstance(response, httpexceptions.HTTPError):
                eresp = err_response(
                    request, IErrorInfo(response), response, None)
                if eresp is not None:
                    return eresp

            return response

        except Exception as exc:
            exc_info = sys.exc_info()

            try:
                err_info = IErrorInfo(exc)
            except TypeError:
                err_info = None

            if err_info is not None:
                eresp = err_response(
                    request, err_info, exc, exc_info)
                if eresp is not None:
                    return eresp

            reraise(*exc_info)

    return error_tween


def exception_tween_factory(handler, registry):
    exc_response = registry.settings['error.exc_response']

    def exception_tween(request):
        try:
            return handler(request)
        except Exception as exc:
            _logger.exception("Uncaught %s at %s" % (
                exc_name(exc), request.url))

            iexc = InternalServerError(sys.exc_info())
            return exc_response(request, iexc, iexc, iexc.exc_info)

    return exception_tween


def exc_name(exc):
    cls = exc.__class__
    module = cls.__module__
    name = getattr(cls, '__qualname__', None)
    if name is None:
        name = cls.__name__
    if module == 'exceptions' or module == 'builtins':
        return name
    return '%s.%s' % (module, name)


def err_info_attr(err_info, exc, attr, default=None):
    try:
        return getattr(err_info, attr)
    except AttributeError:
        warnings.warn("Exception {} doesn't provide attribute: {}".format(
            exc_name(exc), attr))
        return default


def guru_meditation(tb):
    """ Calculate md5-hash from traceback """

    tbhash = md5()
    for fn, line, func, text in tb:
        tbhash.update(''.join((
            # Only file name (without path) taken, so hash
            # should not depend on package location.
            os.path.split(fn)[-1],
            unicode(line), func, text
        )))

    return tbhash.hexdigest()


def json_error(request, err_info, exc, exc_info, debug=True):
    exc_module = exc.__class__.__module__
    if exc_module is None or exc_module == str.__class__.__module__:
        return exc.__class__.__name__
    exc_full_name = exc_module + '.' + exc.__class__.__name__

    result = OrderedDict()

    title = err_info_attr(err_info, exc, 'title')
    if title is not None:
        result['title'] = request.localizer.translate(title)

    message = err_info_attr(err_info, exc, 'message')
    if message is not None:
        result['message'] = request.localizer.translate(message)

    result['exception'] = exc_full_name
    result['status_code'] = err_info_attr(err_info, exc, 'http_status_code', 500)

    data = err_info_attr(err_info, exc, 'data')
    if data is not None and len(data) > 0:
        result['data'] = data

    if exc_info is not None:
        tb = traceback.extract_tb(exc_info[2])
        result['guru_meditation'] = guru_meditation(tb)
        if debug:
            result['traceback'] = map(
                lambda itm: OrderedDict(zip(
                    ('file', 'line', 'func', 'text'),
                    itm)), tb)

    return result


def json_error_response(request, err_info, exc, exc_info, debug=True):
    return Response(
        json.dumps(json_error(request, err_info, exc, exc_info, debug=debug)),
        content_type=b'application/json',
        status_code=err_info_attr(err_info, exc, 'http_status_code', 500))


def html_error_response(request, err_info, exc, exc_info, debug=True):
    response = render_to_response(
        'nextgisweb:pyramid/template/error.mako',
        dict(
            err_info=err_info,
            exc=exc, exc_info=exc_info,
            debug=debug
        ),
        request=request)

    response.status = err_info_attr(err_info, exc, 'http_status_code', 500)
    return response


class InternalServerError(Exception):
    implements(IErrorInfo)
    http_status_code = 500
    message = "Internal server error"

    def __init__(self, exc_info):
        self.exc_info = exc_info


@adapter_hooks.append
def adapt_httpexception(iface, obj):
    if (
        issubclass(iface, IErrorInfo)
        and isinstance(obj, httpexceptions.HTTPError)  # NOQA: W503
    ):
        provide_error_info(
            obj, message=obj.detail, title=obj.title,
            http_status_code=obj.code)

        return IErrorInfo(obj)


# Patch useful pyramid HTTP exceptions with translatable strings
for exc, title in (
    (httpexceptions.HTTPBadRequest, _("Bad request")),
    (httpexceptions.HTTPForbidden, _("Forbidden")),
    (httpexceptions.HTTPNotFound, _("Not found")),
    (httpexceptions.HTTPUnprocessableEntity, _("Unprocessable entity")),
    (httpexceptions.HTTPInternalServerError, _("Internal server error")),
    (httpexceptions.HTTPNotImplemented, _("Not implemented")),
    (httpexceptions.HTTPServiceUnavailable, _("Service unavailable")),
):
    exc.title = title
