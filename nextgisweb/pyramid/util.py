import os
import io
import os.path
import errno
import fcntl
import secrets
import string
from calendar import timegm
from logging import getLogger

from ..i18n import trstring_factory

COMP_ID = 'pyramid'
_ = trstring_factory(COMP_ID)

_logger = getLogger(__name__)


def viewargs(**kw):

    def wrap(f):

        def wrapped(request, *args, **kwargs):
            return f(request, *args, **kwargs)

        wrapped.__name__ = 'args(%s)' % f.__name__
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


def datetime_to_unix(dt):
    return timegm(dt.timetuple())
