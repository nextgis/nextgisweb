# -*- coding: utf-8 -*-
from __future__ import division, absolute_import, print_function, unicode_literals
import six

from ..i18n import trstring_factory

COMP_ID = 'pyramid'
_ = trstring_factory(COMP_ID)


def viewargs(**kw):

    def wrap(f):

        def wrapped(request, *args, **kwargs):
            return f(request, *args, **kwargs)

        wrapped.__name__ = ('args(%s)' % f.__name__) if six.PY3 else (b'args(%s)' % f.__name__)
        wrapped.__viewargs__ = kw

        return wrapped

    return wrap


class ClientRoutePredicate(object):
    def __init__(self, val, config):
        self.val = val

    def text(self):
        return 'client'

    phash = text

    def __call__(self, context, request):
        return True

    def __repr__(self):
        return "<client>"


class RequestMethodPredicate(object):
    def __init__(self, val, config):
        if isinstance(val, six.string_types):
            val = (val, )

        self.val = val

    def text(self):
        return 'method = %s' % (self.val, )

    phash = text

    def __call__(self, context, request):
        return request.method in self.val


class JsonPredicate(object):
    target = ('application/json', )
    test = ('text/html', 'application/xhtml+xml', 'application/xml')

    def __init__(self, val, config):
        self.val = val

    def text(self):
        return 'json'

    phash = text

    def __call__(self, context, request):
        return self.val and (
            request.accept.best_match(self.target + self.test) in self.target
            or request.GET.get('format') == 'json')  # NOQA: W503


def header_encoding_tween_factory(handler, registry):
    """ Force unicode headers to latin-1 encoding in Python 2 environment """

    if six.PY3:
        return handler

    def header_encoding_tween(request):
        response = handler(request)

        headers = response.headers
        for h in (
            'Content-Type',
        ):
            if h in headers:
                v = headers[h]
                if type(h) == unicode or type(v) == unicode:
                    headers[h.encode('latin-1')] = v.encode('latin-1')

        return response

    return header_encoding_tween
