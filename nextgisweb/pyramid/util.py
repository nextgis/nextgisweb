import re
import secrets
import string
from calendar import timegm
from collections import defaultdict
from pathlib import Path
from typing import Any, Optional, Sequence, Tuple, Union


def viewargs(
    *,
    renderer: Optional[str] = None,
    query_params: Optional[Sequence[Union[Tuple[str, Any], Tuple[str, Any, Any]]]] = None,
):
    def wrap(func):
        if renderer is not None:
            func.__pyramid_renderer__ = renderer
        if query_params is not None:
            func.__pyramid_query_params__ = query_params
        return func

    return wrap


class StaticMap:
    def __init__(self):
        def node():
            res = defaultdict(node)
            res[None] = None
            return res

        self.data = node()

    def add(self, uri, path):
        n = self.data
        for p in uri.split("/"):
            n = n[p]
        n[None] = path

    def lookup(self, subpath) -> Path:
        n = self.data
        u = list(subpath)
        while True:
            try:
                h = u.pop(0)
            except IndexError:
                raise KeyError
            if h in n:
                n = n[h]
            else:
                if p := n[None]:
                    return p / h / "/".join(u)
                else:
                    raise KeyError


class StaticSourcePredicate:
    def __init__(self, value, config):
        assert value is True
        self.value = value

    def text(self):
        return "static_source"

    phash = __repr__ = text

    def __call__(self, context, request):
        subpath = context["match"]["subpath"]
        static_map = request.registry.settings["pyramid.static_map"]

        try:
            path = static_map.lookup(subpath)
        except KeyError:
            return False
        else:
            request.environ["static_path"] = path
            return True


def gensecret(length):
    symbols = string.ascii_letters + string.digits
    return "".join([secrets.choice(symbols) for i in range(length)])


def datetime_to_unix(dt):
    return timegm(dt.timetuple())


origin_pattern = re.compile(r"^(https?)://(\*\.)?([\w\-\.]{3,})(:\d{2,5})?/?$")


def parse_origin(url):
    m = origin_pattern.match(url)
    if m is None:
        raise ValueError("Invalid origin.")
    scheme, wildcard, domain, port = m[1], m[2], m[3], m[4]
    domain = domain.rstrip(".")
    is_wildcard = wildcard is not None
    if is_wildcard:
        domain = wildcard + domain
    return is_wildcard, scheme, domain, port


def set_output_buffering(request, response, value, *, strict=False):
    if value is None:
        return

    opts = request.env.pyramid.options
    default = opts["response_buffering"]
    if value == default:
        return

    x_accel_buffering = opts["x_accel_buffering"]
    if x_accel_buffering:
        response.headers["X-Accel-Buffering"] = "yes" if value else "no"
    elif strict:
        raise RuntimeError("Failed to set output buffering")
