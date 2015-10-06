# -*- coding: utf-8 -*-
from __future__ import unicode_literals
from ..i18n import trstring_factory

COMP_ID = 'pyramid'
_ = trstring_factory(COMP_ID)


def viewargs(**kw):

    def wrap(f):

        def wrapped(request, *args, **kwargs):
            return f(request, *args, **kwargs)

        wrapped.__name__ = bytes('args(%s)' % f.__name__)
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
        if isinstance(val, basestring):
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
            or request.GET.get('format') == 'json')
