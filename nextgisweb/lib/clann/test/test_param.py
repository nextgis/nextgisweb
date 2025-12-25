from functools import partial

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
    assert o(str | None, None) == o(str | None, None) == dict(type=str, default=None)

    assert a(str) == dict(type=str)
    assert a(str | None) == a(str | None) == dict(type=str, default=None, nargs="?")


def test_bool():
    assert o(bool) == dict(type=bool, required=True)
    assert o(bool | None) == o(bool | None) == dict(type=bool, default=None)
    assert o(bool, default=False) == dict(action="store_true", default=False)
    assert (
        o(bool | None, flag=True)
        == o(None | bool, flag=True)
        == o(bool | None, flag=True)
        == dict(default=None, action="flag")
    )


def test_list():
    assert o(list[str]) == o(list[str]) == dict(type=str, default=[], action="append")
    assert (
        o(list[str] | None) == o(list[str] | None) == dict(type=str, default=None, action="append")
    )

    assert a(list[str]) == dict(type=str, default=[], nargs="+")
    with pytest.raises(NotImplementedError):
        a(list[str] | None)
