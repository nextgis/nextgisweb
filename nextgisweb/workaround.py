# ruff: noqa: F401

# https://bugs.python.org/issue47082
import numpy
from backports.datetime_fromisoformat import MonkeyPatch

MonkeyPatch.patch_fromisoformat()
