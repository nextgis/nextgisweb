# ruff: noqa: F401
import sys

# https://bugs.python.org/issue47082
import numpy

if sys.version_info < (3, 11):
    from backports.datetime_fromisoformat import MonkeyPatch

    MonkeyPatch.patch_fromisoformat()
