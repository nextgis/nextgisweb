import os
import os.path
import re
import secrets
import string
from calendar import timegm
from collections import defaultdict
from mimetypes import guess_type
from pathlib import Path
from sys import _getframe
from typing import TypeVar

from pyramid.httpexceptions import HTTPNotFound
from pyramid.response import FileResponse

from nextgisweb.env.package import pkginfo
from nextgisweb.lib.i18n import trstr_factory
from nextgisweb.lib.imptool import module_path
from nextgisweb.lib.logging import logger

COMP_ID = 'pyramid'
_ = trstr_factory(COMP_ID)


JSONType = TypeVar('JSONType')


def viewargs(*, renderer=None):

    def wrap(func):
        if renderer is not None:
            func.__pyramid_renderer__ = renderer
        return func

    return wrap


class ClientRoutePredicate:
    def __init__(self, val, config):
        self.val = val

    def text(self):
        return 'client'

    phash = text

    def __call__(self, context, request):
        return True

    def __repr__(self):
        return "<client>"


class ErrorRendererPredicate:
    def __init__(self, val, config):
        self.val = val

    def text(self):
        return 'error_renderer'

    phash = text

    def __call__(self, context, request):
        return True

    def __repr__(self):
        return "<error_renderer>"


class StaticMap:

    def __init__(self):
        def node():
            res = defaultdict(node)
            res[None] = None
            return res
        self.data = node()

    def add(self, uri, path):
        n = self.data
        for p in uri.split('/'):
            n = n[p]
        n[None] = path

    def lookup(self, subpath) -> Path:
        n = self.data
        u = list(subpath)
        while True:
            h = u.pop(0)
            if h in n:
                n = n[h]
            else:
                if p := n[None]:
                    return p / h / '/'.join(u)
                else:
                    raise KeyError


class StaticSourcePredicate:

    def __init__(self, value, config):
        assert value is True
        self.value = value

    def text(self):
        return 'static_source'

    phash = text

    def __call__(self, context, request):
        subpath = context['match']['subpath']
        static_map = request.registry.settings['pyramid.static_map']

        try:
            path = static_map.lookup(subpath)
        except KeyError:
            return False
        else:
            request.environ['static_path'] = path
            return True

    def __repr__(self):
        return self.text()


class StaticFileResponse(FileResponse):

    def __init__(self, filename, *, request) -> None:
        content_type, _ = guess_type(filename)

        found_encoding = None
        if (
            (pref := request.env.pyramid.options['compression.algorithms'])
            and (aenc := request.accept_encoding)
            and (match := aenc.best_match(pref))
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


def find_template(name, func=None, stack_level=1):
    if func is not None:
        def _traverse():
            f = func
            while f is not None:
                yield f.__module__
                f = getattr(f, '__wrapped__', None)
        modules = _traverse()
    else:
        fr = _getframe(stack_level)
        modules = [fr.f_globals['__name__'], ]

    for m in modules:
        parts = m.split('.')
        while parts:
            if pkginfo._mod_comp.get('.'.join(parts)):
                fn = module_path('.'.join(parts)) / 'template' / name
                if fn.exists():
                    logger.debug(
                        "Template %s found in %s", name,
                        fn.relative_to(Path().resolve()))
                    return str(fn)
            parts.pop(-1)

    raise ValueError(f"Template '{name}' not found")


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


def set_output_buffering(request, response, value, *, strict=False):
    if value is None:
        return

    opts = request.env.pyramid.options
    default = opts['response_buffering']
    if value == default:
        return

    x_accel_buffering = opts['x_accel_buffering']
    if x_accel_buffering:
        response.headers['X-Accel-Buffering'] = 'yes' if value else 'no'
    elif strict:
        raise RuntimeError("Failed to set output buffering")
