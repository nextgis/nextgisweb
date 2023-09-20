from functools import partial
from typing import List, Optional

import pytest

from ..param import arg, opt


def t(cls, name, annotation, *args, **kwargs):
    o = cls(*args, **kwargs)
    o.name = name
    o.annotation = annotation
    return o._add_argument()[1]


o = partial(t, opt, "opt")
a = partial(t, arg, "arg")


def test_generic():
    assert o(str) == dict(type=str, required=True)
    assert o(Optional[str], None) == dict(type=str, default=None)

    assert a(str) == dict(type=str)
    assert a(Optional[str]) == dict(type=str, default=None, nargs="?")


def test_bool():
    assert o(bool) == dict(type=bool, required=True)
    assert o(Optional[bool]) == dict(type=bool, default=None)
    assert o(bool, False) == dict(action="store_true", default=False)
    assert o(Optional[bool], flag=True) == dict(default=None, action="flag")


def test_list():
    assert o(List[str]) == dict(type=str, default=[], action="append")
    assert o(Optional[List[str]]) == dict(type=str, default=None, action="append")

    assert a(List[str]) == dict(type=str, default=[], nargs="+")
    with pytest.raises(NotImplementedError):
        a(Optional[List[str]])
