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
    assert o(str) == {"type": str, "required": True}
    assert o(str | None, None) == o(str | None, None) == {"type": str, "default": None}

    assert a(str) == {"type": str}
    assert a(str | None) == a(str | None) == {"type": str, "default": None, "nargs": "?"}


def test_bool():
    assert o(bool) == {"type": bool, "required": True}
    assert o(bool | None) == o(bool | None) == {"type": bool, "default": None}
    assert o(bool, default=False) == {"action": "store_true", "default": False}
    assert (
        o(bool | None, flag=True)
        == o(None | bool, flag=True)
        == o(bool | None, flag=True)
        == {"default": None, "action": "flag"}
    )


def test_list():
    assert o(list[str]) == o(list[str]) == {"type": str, "default": [], "action": "append"}
    assert (
        o(list[str] | None)
        == o(list[str] | None)
        == {"type": str, "default": None, "action": "append"}
    )

    assert a(list[str]) == {"type": str, "default": [], "nargs": "+"}
    with pytest.raises(NotImplementedError):
        a(list[str] | None)
