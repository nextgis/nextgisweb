from abc import ABC, abstractmethod
from collections.abc import Callable
from contextlib import suppress

import pytest

from ..container import Container, ContainerNotWiredError
from ..inject import Injector, UnresolvedDependency, inject_wrapper

A = type("A", (str,), {})
B = type("B", (str,), {})

Cnt = type("Cnt", (Container,), {})


@pytest.fixture
def cnt():
    c = Cnt().wire()
    try:
        yield c
    finally:
        with suppress(ContainerNotWiredError):
            c.unwire()


inject = Injector(Cnt)


@inject()
def direct(*, a: A = inject.arg(), b: B = inject.arg()):
    return a + b


@inject()
def forward(*, a: "A" = inject.arg(), b: "B" = inject.arg()) -> str:
    return a + b


@pytest.mark.parametrize("func", [direct, forward])
def test_func(func: Callable, cnt: Cnt):
    with pytest.raises(UnresolvedDependency):
        func()

    cnt.register(A, "A")
    cnt.register(B, "B")

    assert func() == "AB"
    assert func(b=B("b")) == "Ab"

    cnt.register(A, "X")
    cnt.register(B, "Y")

    assert func() == "XY"

    assert isinstance(func, inject_wrapper)

    assert len(func._inj_values) == 2
    cnt.unregister(A)
    assert len(func._inj_values) == 1
    cnt.unwire()
    assert len(func._inj_values) == 0


class Direct:
    @inject()
    def __call__(self, *, a: A = inject.arg(), b: B = inject.arg()):
        assert isinstance(self, Direct)
        return a + b

    @classmethod
    @inject()
    def cmeth(cls, *, a: A = inject.arg(), b: B = inject.arg()):
        assert cls is Direct
        return a + b


class Forward(Direct):
    @inject()
    def __call__(
        self,
        *,
        a: "A" = inject.arg(),
        b: "B" = inject.arg(),
    ) -> "str":
        assert isinstance(self, Forward)
        return a + b

    @classmethod
    @inject()
    def cmeth(cls, *, a: "A" = inject.arg(), b: "B" = inject.arg()) -> "str":
        assert cls is Forward
        return a + b


@pytest.mark.parametrize("cls", [Direct, Forward])
def test_cls(cls: type[Direct], cnt: Cnt):
    obj = cls()

    with pytest.raises(UnresolvedDependency):
        obj()

    cnt.register(A, "A")
    cnt.register(B, "B")

    assert obj() == obj.cmeth() == "AB"
    assert obj(b=B("b")) == "Ab"

    cnt.register(A, "X")
    cnt.register(B, "Y")

    assert obj() == obj.cmeth() == "XY"


def test_abc(cnt: Cnt):
    class Base(ABC):
        @abstractmethod
        def __call__(self) -> str: ...

    class Impl(Base):
        @inject()
        def __call__(self, *, a: A = inject.arg(), b: B = inject.arg()) -> str:
            return a + b

    obj = Impl()

    with pytest.raises(UnresolvedDependency):
        obj()

    cnt.register(A, "A")
    cnt.register(B, "B")

    assert obj() == "AB"
