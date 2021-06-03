# -*- coding: utf-8 -*-
from __future__ import division, absolute_import, print_function, unicode_literals
import os
import io
import re
import os.path
import errno
import fcntl
import secrets
import string
from calendar import timegm
from logging import getLogger
import six

from ..i18n import trstring_factory

COMP_ID = 'pyramid'
_ = trstring_factory(COMP_ID)

_logger = getLogger(__name__)


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


class ErrorRendererPredicate(object):
    def __init__(self, val, config):
        self.val = val

    def text(self):
        return 'error_renderer'

    phash = text

    def __call__(self, context, request):
        return True

    def __repr__(self):
        return "<error_renderer>"


def gensecret(length):
    symbols = string.ascii_letters + string.digits
    return ''.join([
        secrets.choice(symbols)
        for i in range(length)])


def persistent_secret(fn, secretgen):
    try:
        fh = os.open(fn, os.O_CREAT | os.O_EXCL | os.O_WRONLY)
    except OSError as e:
        if e.errno == errno.EEXIST:
            # Failed as the file already exists
            with io.open(fn, 'r') as fd:
                fcntl.flock(fd, fcntl.LOCK_EX)
                return fd.read()
        else:
            raise

    # No exception, so the file must have been created successfully
    with os.fdopen(fh, 'w') as fd:
        fcntl.flock(fd, fcntl.LOCK_EX)
        secret = secretgen()
        fd.write(secret)
        return secret


def header_encoding_tween_factory(handler, registry):
    """ Force unicode headers to latin-1 encoding in Python 2 environment """

    if six.PY3:
        return handler

    def header_encoding_tween(request):
        response = handler(request)

        headers = response.headers
        for h in (
            'Content-Type',
            'Content-Disposition',
        ):
            if h in headers:
                v = headers[h]
                if type(h) == unicode or type(v) == unicode:  # NOQA: F821
                    headers[h.encode('latin-1')] = v.encode('latin-1')

        return response

    return header_encoding_tween


def datetime_to_unix(dt):
    return timegm(dt.timetuple())
