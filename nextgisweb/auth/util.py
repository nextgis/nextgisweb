import re
from time import time

from nextgisweb.lib.json import dumps as json_dumps
from nextgisweb.lib.logging import lazy_str


def clean_user_keyname(value):
    # Replace all invalid chars with underscores
    value = re.sub(r"(_*[^A-Za-z0-9_]+)+_*", "_", value)

    # Add "u" prefix if it doesn't start with letter
    value = re.sub(r"^_*([^A-Za-z])", r"u\1", value)

    # Strip underscores
    value = value.strip("_")

    return value


def enum_name(value, idx, sep="_"):
    if idx > 0:
        value = value.rstrip(sep)
        value += sep + str(idx + 1)
    return value


def current_tstamp(override=None):
    return int(time()) if override is None else override


_re_secret = re.compile(r"(?:^|.+_)(?:password|secret)(?:_.+|$)")
_re_thin = re.compile(r"(?:^|.+_)(?:token(?!_type$)|code)(?:_.+|$)")


@lazy_str
def log_lazy_data(value):
    if isinstance(value, str):
        result = []
        for p in value.split("."):
            c = max(min(len(p) // 4, 6), 2)
            if 2 * c >= len(p):
                result.append(p)
            else:
                result.append(p[0:c] + "*" + p[-c:])
        return ".".join(result)
    elif isinstance(value, dict):
        result = dict()
        for k, v in value.items():
            if type(v) in (str, dict):
                if _re_secret.search(k):
                    v = "*"
                elif _re_thin.search(k):
                    v = str(log_lazy_data(v))
            result[k] = v
        return json_dumps(result)
    raise NotImplementedError


def sync_ulg_cookie_callback(request, response):
    from nextgisweb.pyramid import WebSession

    value = request.environ.pop("auth.ulg_cookie")
    cs = WebSession.cookie_settings(request)
    if value is None:
        response.delete_cookie("ngw_ulg", path=cs["path"], domain=cs["domain"])
    else:
        response.set_cookie("ngw_ulg", value, **cs)


def sync_ulg_cookie(request, *, user=None):
    if user is None:
        user = request.user

    user_language = user.language
    if request.cookies.get("ngw_ulg") == user_language:
        return

    if "auth.ulg_cookie" not in request.environ:
        request.add_response_callback(sync_ulg_cookie_callback)
    request.environ["auth.ulg_cookie"] = user_language


def reset_slg_cookie_callback(request, response):
    from nextgisweb.pyramid import WebSession

    cs = WebSession.cookie_settings(request)
    response.delete_cookie("ngw_slg", path=cs["path"], domain=cs["domain"])


def reset_slg_cookie(request):
    request.add_response_callback(reset_slg_cookie_callback)
