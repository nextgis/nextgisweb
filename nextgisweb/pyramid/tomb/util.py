import re
from inspect import isclass
from sys import _getframe
from typing import Type

from msgspec import Struct

from nextgisweb.lib.apitype import ContentType

ROUTE_PATTERN = dict(
    str=None,
    any=r".*",
    int=r"-?[0-9]+",
    uint=r"[0-9]+",
)

ROUTE_RE = re.compile(
    r"\{(?P<k>\w+)(?:\:(?P<t>(?:" + "|".join(ROUTE_PATTERN.keys()) + r")))?(?:\:(?P<r>.+?))?\}"
)


def push_stacklevel(kwargs, push, ainfo=False):
    result = kwargs.pop("stacklevel", 0) + 1
    if push:
        kwargs["stacklevel"] = result
    if ainfo:
        frame = _getframe(result + 1)
        kwargs["_info"] = (frame.f_globals["__file__"], frame.f_lineno, "", "")
    return result


def is_json_type(t: Type) -> bool:
    if isclass(t) and issubclass(t, Struct):
        return True

    if ContentType.JSON in getattr(t, "__metadata__", ()):
        return True

    return False
