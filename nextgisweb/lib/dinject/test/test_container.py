import pytest

from ..container import Container, ContainerNotWiredError, ContainerWiredError

P = type("P", (str,), {})
Cnt = type("Cnt", (Container,), {})


def test_container():
    c = Cnt()

    invalidate_calls = 0

    def _invalidate():
        nonlocal invalidate_calls
        invalidate_calls += 1

    with pytest.raises(ContainerNotWiredError):
        c._from_container((P,), _invalidate)

    c.wire()
    with pytest.raises(ContainerWiredError):
        c.wire()

    with pytest.raises(KeyError):
        c._from_container((P,), _invalidate)

    c.register(P, "foo")
    assert c._from_container((P,), _invalidate) == "foo"

    c.register(P, "bar", selector=("qux",))
    assert c._from_container((P, "qux"), _invalidate) == "bar"

    assert invalidate_calls == 0

    c.register(P, "zoo")
    assert invalidate_calls == 1
    assert c._from_container((P,), _invalidate) == "zoo"

    c.unwire()
    assert invalidate_calls == 3


def test_wire_unwire():
    c = Cnt()

    c.wire()
    assert Cnt._instance is c

    c.unwire()
    assert Cnt._instance is None

    c.wire()
    assert Cnt._instance is c
