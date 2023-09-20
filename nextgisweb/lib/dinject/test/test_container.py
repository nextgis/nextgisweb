import pytest

from ..container import Container, ContainerNotWiredError, ContainerWiredError

P = type("P", (str,), {})
Cnt = type("Cnt", (Container,), {})


def test_container():
    c = Cnt()

    invs = 0

    def _inv():
        nonlocal invs
        invs += 1

    with pytest.raises(ContainerNotWiredError):
        c._from_container((P,), _inv)

    c.wire()
    with pytest.raises(ContainerWiredError):
        c.wire()

    with pytest.raises(KeyError):
        c._from_container((P,), _inv)

    c.register(P, "a")
    assert c._from_container((P,), _inv) == "a"

    c.register(P, "sel", selector=("sel",))
    assert c._from_container((P, "sel"), _inv) == "sel"

    assert invs == 0

    c.register(P, "b")
    assert invs == 1
    assert c._from_container((P,), _inv) == "b"

    c.unwire()
    assert invs == 3
