import pytest
from msgspec import Meta, Struct, ValidationError
from msgspec.json import decode, encode
from typing_extensions import Annotated

from ..struct import OP, Default, Derived, ReadOnly, flag, omit

BRIEF = flag("Brief")


class Object(Struct, kw_only=True):
    id: ReadOnly[int]
    attr: Default[Annotated[str, Meta(min_length=1)]]
    long: Annotated[str, omit(BRIEF)]


def encdec(data, tdef):
    encoded = encode(data)
    return decode(encoded, type=tdef)


def test_create():
    D = Derived[Object, OP.CREATE, BRIEF]

    val = encdec({"attr": "value", "other": "value"}, D)
    assert val == D(attr="value")

    with pytest.raises(ValidationError):
        encdec({"attr": ""}, D)


def test_read():
    DLong = Derived[Object, OP.READ]
    assert DLong.__name__ == "ObjectRead"
    assert "long" in DLong.__struct_fields__

    DShort = Derived[Object, OP.READ, BRIEF]
    assert DShort.__name__ == "ObjectReadBrief"
    assert "long" not in DShort.__struct_fields__

    v = DLong(id=1, attr="foo", long="bar")
    assert encode(v) == b'{"id":1,"attr":"foo","long":"bar"}'


def test_update():
    Update = Derived[Object, OP.UPDATE, BRIEF]

    v = encdec({"id": 0, "attr": "value", "other": "value"}, Update)
    assert v == Update(attr="value")
