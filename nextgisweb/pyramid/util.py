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
from hashlib import md5
from collections import namedtuple
from calendar import timegm
from logging import getLogger
from pkg_resources import get_distribution
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


def pip_freeze():
    result = getattr(pip_freeze, '_result', None)
    if result is not None:
        return result

    # Read installed packages from pip freeze
    from pip._internal.operations.freeze import freeze
    distinfo = []
    h = md5()

    for line in freeze():
        line = line.strip().lower()
        if line == '':
            continue
        h.update(line.encode('utf-8'))

        dinfo = None
        mpkg = re.match(r'(.+)==(.+)', line)
        if mpkg:
            dinfo = DistInfo(
                name=mpkg.group(1),
                version=mpkg.group(2),
                commit=None)

        mgit = re.match(r'-e\sgit\+.+\@(.{8}).{32}\#egg=(\w+).*$', line)
        if mgit:
            dinfo = DistInfo(
                name=mgit.group(2),
                version=get_distribution(mgit.group(2)).version,
                commit=mgit.group(1))

        if dinfo is not None:
            distinfo.append(dinfo)
        else:
            _logger.warn("Could not parse pip freeze line: %s", line)

    static_key = h.hexdigest()[:8]

    def _sort_key(di):
        d = get_distribution(di.name)
        ep = len(d.get_entry_map('nextgisweb.packages')) != 0
        return (not ep, di.name)

    distinfo = sorted(distinfo, key=_sort_key)

    result = (static_key, tuple(distinfo))
    setattr(pip_freeze, '_result', result)
    return result


DistInfo = namedtuple('DistInfo', ['name', 'version', 'commit'])
