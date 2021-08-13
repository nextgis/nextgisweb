# -*- coding: utf-8 -*-
from __future__ import division, absolute_import, print_function, unicode_literals

from datetime import datetime, date, time

import six
if six.PY2:
    from dateutil.parser import isoparser
    _isoparser8601 = isoparser()

if six.PY3:
    from functools import lru_cache
    from pathlib import Path
    from html import escape as html_escape
else:
    from backports.functools_lru_cache import lru_cache
    from pathlib2 import Path
    from cgi import escape as html_escape

__all__ = [
    'lru_cache',
    'Path',
    'html_escape',
]


def datetime_to_timestamp(value):
    if six.PY3:
        return value.timestamp()
    else:
        from time import mktime
        return mktime(value.timetuple())


def timestamp_to_datetime(value):
    if six.PY3:
        return datetime.fromtimestamp(value)
    else:
        return datetime.utcfromtimestamp(value)


def date_fromisoformat(iso_string):
    if six.PY3:
        return date.fromisoformat(iso_string)
    else:
        return _isoparser8601.parse_isodate(iso_string)


def time_fromisoformat(iso_string):
    if six.PY3:
        return time.fromisoformat(iso_string)
    else:
        return _isoparser8601.parse_isotime(iso_string)


def datetime_fromisoformat(iso_string):
    if six.PY3:
        return datetime.fromisoformat(iso_string)
    else:
        return _isoparser8601.isoparse(iso_string)
