from functools import partial

import pytest

from ..container import Container
from ..inject import UnresolvedDependency
from ..inject import inject as _inject

A = type("A", (str,), {})
B = type("B", (str,), {})

CntA = type("CntA", (Container,), {})
CntB = type("CntB", (Container,), {})


inject = partial(
    _inject,
    auto_provide={
        CntA: lambda x: x is A,
        CntB: lambda x: x is B,
    },
)


@inject()
def fn(*, a: A, b: B):
    return a + b


class Class:
    @inject()
    def __call__(self, *, a: A, b: B):
        assert isinstance(self, Class)
        return a + b

    @classmethod
    @inject()
    def cmeth(cls, *, a: A, b: B):
        assert cls is Class
        return a + b


def test_inject():
    obj = Class()

    ca = CntA().wire()
    cb = CntB().wire()

    with pytest.raises(UnresolvedDependency):
        fn()

    ca.register(A, "A")
    cb.register(B, "B")

    assert fn() == obj() == obj.cmeth() == "AB"

    ca.register(A, "X")
    cb.register(B, "Y")

    assert fn() == obj() == obj.cmeth() == "XY"

    assert len(fn._inj_values) == 2
    ca.unregister(A)
    assert len(fn._inj_values) == 1
    cb.unwire()
    assert len(fn._inj_values) == 0
