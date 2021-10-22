import warnings

from datetime import datetime, date, time

from functools import lru_cache
from pathlib import Path
from html import escape as html_escape

warnings.warn(
    "The 'nextgisweb.compat' module deprecated now and it's going to be "
    "removed in 4.1.0. Use native python 3 modules instead.",
    DeprecationWarning, stacklevel=2)


__all__ = [
    'lru_cache',
    'Path',
    'html_escape',
]


def datetime_to_timestamp(value):
    return value.timestamp()


def timestamp_to_datetime(value):
    return datetime.fromtimestamp(value)


def date_fromisoformat(iso_string):
    return date.fromisoformat(iso_string)


def time_fromisoformat(iso_string):
    return time.fromisoformat(iso_string)


def datetime_fromisoformat(iso_string):
    return datetime.fromisoformat(iso_string)
