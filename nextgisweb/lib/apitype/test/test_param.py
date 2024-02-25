from enum import Enum
from itertools import chain, product
from typing import Dict, List, Literal, Optional, TypeVar, Union

import pytest
from msgspec import UNSET, Meta, Struct, UnsetType, field
from typing_extensions import Annotated

from ..param import DefaultsNotSupported, Query, QueryParam, Shape
from ..query_string import QueryString

T = TypeVar("T")

FortyTwo = Annotated[int, Meta(ge=42, le=42)]
Positive = Annotated[T, Meta(gt=0)]
EmptyList = Annotated[List[T], Meta(max_length=0)]
ExactlyTwo = Annotated[List[T], Meta(min_length=2, max_length=2)]
TwoOrThree = Annotated[List[T], Meta(min_length=2, max_length=3)]
LiteralA = Literal["foo", "bar", "qux"]


class EnumA(Enum):
    FOO = "foo"
    BAR = "bar"
    QUX = "qux"


class StructA(Struct, kw_only=True):
    i: int
    b: bool = False
    s: Optional[str] = None


class StructB(Struct, kw_only=True):
    i: int = field(name="j")


class tc:
    registry = list()

    def __init__(self, value, *types):
        self._value = value
        self._types = types
        self._valid = list()
        self._invalid = list()
        self.registry.append(self)

    def valid(self, valid):
        self._valid.extend(valid)
        return self

    def invalid(self, invalid):
        self._invalid.extend(invalid)
        return self

    def vproduct(self):
        return [(list(p) + [self._value]) for p in product(self._types, self._valid)]

    def iproduct(self):
        return list(product(self._types, self._invalid))


tc("qux", str).valid(["qux", "qu%78"])
tc("foo bar", str).valid(["foo bar", "foo%20bar"])
tc(42, int).valid(["42", "042"]).invalid(["foo", "4.2e1"])
tc(42, Positive[int], FortyTwo).invalid(["-42", "0"])
tc(42, Annotated[int, Query(name="j"), Query(name="k")]).valid(["k=42"])
tc(True, bool).valid(["true", "yes"]).invalid(["1", "YES"])
tc(False, bool).valid(["false", "no"]).invalid(["0", "NO"])
tc(3.14, float, Positive[float]).valid(["3.14", "03.14"]).invalid(["1e10"])
tc(EnumA.FOO, EnumA).valid(["foo"]).invalid(["zoo"])
tc("qux", LiteralA).valid(["qux", "qu%78"]).invalid(["zoo"])

tc([1, 2], List[int], ExactlyTwo[int], TwoOrThree[int]).valid(["1,2"])
tc([1, 2], ExactlyTwo[int], TwoOrThree[int]).valid(["1,2"]).invalid(["", "1,2,3,4"])
tc(["foo,bar", "qux"], List[str]).valid(["foo%2Cbar,qux"])
tc([], List[int], EmptyList[int]).valid([""]).invalid(["foo"])

tc(StructA(i=1, b=True, s="foo"), StructA).valid(["i=1&b=true&s=foo"])
tc(StructA(i=1, b=False, s="foo"), StructA).valid(["i=1&s=foo"])
tc(StructA(i=1, b=False, s=None), StructA).valid(["i=1"])
tc(StructB(i=42), StructB).valid(["j=42"])
tc(dict(a=42), Dict[str, int], Dict[str, FortyTwo]).valid(["par[a]=42"])
tc({42: "qux"}, Dict[int, str], Dict[FortyTwo, str]).valid(["par[42]=qux", "par[4%32]=qu%78"])


@pytest.mark.parametrize("tdef,raw,expected", chain(*(c.vproduct() for c in tc.registry)))
def test_valid(tdef, raw, expected):
    if "=" not in raw:
        raw = "par=" + raw

    qs = QueryString(raw)
    qs_empty = QueryString("")

    qp = QueryParam("par", tdef)
    assert qp.decoder(qs) == expected

    if qp.shape.value != Shape.OBJECT.value:
        with pytest.raises(ValueError):
            qp.decoder(qs_empty)

        dec_default = QueryParam("par", tdef, expected).decoder
        dec_none = QueryParam("par", Optional[tdef], None).decoder
        dec_unset = QueryParam("par", Union[tdef, UnsetType], UNSET).decoder

        assert dec_none(qs) == expected
        assert dec_default(qs_empty) == expected
        assert dec_none(qs_empty) is None
        assert dec_unset(qs_empty) is UNSET
    else:
        with pytest.raises(DefaultsNotSupported):
            QueryParam("par", tdef, expected)


@pytest.mark.parametrize("tdef,raw", chain(*(c.iproduct() for c in tc.registry)))
def test_invalid(tdef, raw):
    if "=" not in raw:
        raw = "par=" + raw

    qs = QueryString(raw)
    qp = QueryParam("par", tdef)
    with pytest.raises(Exception):
        qp.decoder(qs)
