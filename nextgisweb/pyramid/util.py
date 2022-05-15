import os
import io
import os.path
import errno
import fcntl
import re
import secrets
import string
from calendar import timegm
from mimetypes import guess_type

from pyramid.response import FileResponse
from pyramid.httpexceptions import HTTPNotFound

from ..lib.i18n import trstr_factory

COMP_ID = 'pyramid'
_ = trstr_factory(COMP_ID)


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


class StaticFileResponse(FileResponse):

    def __init__(self, filename, *, request) -> None:
        content_type, _ = guess_type(filename)

        found_encoding = None
        if (
            (pref := request.env.pyramid.options['compression.algorithms']) and
            (aenc := request.accept_encoding) and
            (match := aenc.best_match(pref))
        ):
            try_filename = filename + '.' + match
            if os.path.isfile(try_filename):
                filename = try_filename
                found_encoding = match
        
        if found_encoding is None and not os.path.isfile(filename):
            raise HTTPNotFound()
        
        super().__init__(
            filename,
            content_type=content_type,
            cache_max_age=3600,
            request=request)

        if found_encoding:
            self.headers['Content-Encoding'] = found_encoding

        self.headers['Vary'] = 'Accept-Encoding'


def gensecret(length):
    symbols = string.ascii_letters + string.digits
    return ''.join([
        secrets.choice(symbols)
        for i in range(length)])


def datetime_to_unix(dt):
    return timegm(dt.timetuple())


origin_pattern = re.compile(r'^(https?)://(\*\.)?([\w\-\.]{3,})(:\d{2,5})?/?$')


def parse_origin(url):
    m = origin_pattern.match(url)
    if m is None:
        raise ValueError("Invalid origin.")
    scheme, wildcard, domain, port = m[1], m[2], m[3], m[4]
    domain = domain.rstrip('.')
    is_wildcard = wildcard is not None
    if is_wildcard:
        domain = wildcard + domain
    return is_wildcard, scheme, domain, port
