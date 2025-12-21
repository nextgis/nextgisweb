from datetime import date, datetime
from enum import Enum
from itertools import chain, product
from typing import Annotated, Literal, TypeVar

import pytest
from msgspec import UNSET, Meta, Struct, UnsetType, field

from ..param import DefaultsNotSupported, Query, QueryParam, Shape
from ..query_string import QueryString
from ..schema import DatetimeNaive

T = TypeVar("T")

FortyTwo = Annotated[int, Meta(ge=42, le=42)]
Positive = Annotated[T, Meta(gt=0)]
EmptyList = Annotated[list[T], Meta(max_length=0)]
ExactlyTwo = Annotated[list[T], Meta(min_length=2, max_length=2)]
TwoOrThree = Annotated[list[T], Meta(min_length=2, max_length=3)]

LiteralA = Literal["foo", "bar", "qux"]


class EnumA(Enum):
    FOO = "foo"
    BAR = "bar"
    QUX = "qux"


class StructA(Struct, kw_only=True):
    i: int
    b: bool = False
    s: str | None = None
    t: tuple[float, float]


class StructB(Struct, kw_only=True):
    i: int = field(name="j")
    t: tuple[float, float] = (0, 0)


class tc:
    registry = list()

    def __init__(self, value, *types):
        self._value = value
        self._types = types
        self._valid = list()
        self._invalid = list()
        self.registry.append(self)

    def ok(self, *valid):
        self._valid.extend(valid)
        return self

    def err(self, *invalid):
        self._invalid.extend(invalid)
        return self

    def vproduct(self):
        return [(list(p) + [self._value]) for p in product(self._types, self._valid)]

    def iproduct(self):
        return list(product(self._types, self._invalid))


tc("qux", str).ok("qux", "qu%78")
tc("foo bar", str).ok("foo bar", "foo%20bar", "foo+bar")
tc(42, int, float).ok("42", "042").err("foo", "4.2e1")
tc(42, Positive[int], FortyTwo).err("-42", "0")
tc(42, Annotated[int, Query(name="j"), Query(name="k")]).ok("k=42")
tc(True, bool).ok("true", "yes").err("1", "YES")
tc(False, bool).ok("false", "no").err("0", "NO")
tc(3.14, float, Positive[float]).ok("3.14", "03.14").err("1e10")
tc(EnumA.FOO, EnumA).ok("foo").err("zoo")
tc("qux", LiteralA).ok("qux", "qu%78").err("zoo")

tc([1, 2], list[int], ExactlyTwo[int], TwoOrThree[int]).ok("1,2", "1%2C2")
tc((1, 2), tuple[int, ...], tuple[int, float]).ok("1,2", "1%2C2")
tc((1, True), tuple[Positive[int], bool]).ok("1,true").err("-1,true")
tc([1, 2], ExactlyTwo[int], TwoOrThree[int]).ok("1,2").err("", "1,2,3,4")
tc(["foo,bar", "qux"], list[str]).ok("foo%2Cbar,qux")
tc([], list[int], EmptyList[int]).ok("").err("foo")

dt = datetime(2024, 1, 2, 15, 30, 45)
tc(date(2024, 1, 2), date).ok("2024-01-02").err("2024-1-2")
tc(dt, datetime).ok("2024-01-02T15:30:45").err("2024-01-02")
tc(dt.replace(tzinfo=None), DatetimeNaive).ok("2024-01-02T15:30:45").err("2024-01-02T15:30:45Z")

tc(StructA(i=1, b=True, s="foo", t=(0, 3.14)), StructA).ok("i=1&b=true&s=foo&t=0,3.14")
tc(StructA(i=1, b=False, s="foo", t=(0, 0)), StructA).ok("i=1&s=foo&t=0,0")
tc(StructA(i=1, b=False, s=None, t=(0, 0)), StructA).ok("i=1&t=0,0")
tc(StructB(i=42), StructB).ok("j=42")
tc(StructB(i=0, t=(1, 2)), StructB).ok("j=0&t=1,2")
tc(dict(a=42), dict[str, int], dict[str, FortyTwo]).ok("par[a]=42", "par%5Ba%5D=42")
tc({42: "qux"}, dict[int, str], dict[FortyTwo, str]).ok("par[42]=qux", "par[4%32]=qu%78")

tc({0: [1]}, dict[int, list[int]]).ok("par[0]=1").err("par[0]=foo")
tc({0: (1, 2)}, dict[int, tuple[int, int]]).ok("par[0]=1,2")


@pytest.mark.parametrize(
    "wrap",
    [
        pytest.param(lambda x: x, id="raw"),
        pytest.param(lambda x: Annotated[x, Meta()], id="meta"),
    ],
)
@pytest.mark.parametrize("tdef,raw,expected", chain(*(c.vproduct() for c in tc.registry)))
def test_valid(wrap, tdef, raw, expected):
    if "=" not in raw:
        raw = "par=" + raw

    qs = QueryString(raw)
    qs_empty = QueryString("")

    tdef = wrap(tdef)
    qp = QueryParam("par", tdef)
    assert qp.decoder(qs) == expected

    if qp.shape.value != Shape.OBJECT.value:
        with pytest.raises(ValueError):
            qp.decoder(qs_empty)

        dec_default = QueryParam("par", tdef, expected).decoder
        dec_none = QueryParam("par", tdef | None, None).decoder
        dec_unset = QueryParam("par", tdef | UnsetType, UNSET).decoder

        assert dec_none(qs) == expected
        assert dec_default(qs_empty) == expected
        assert dec_none(qs_empty) is None
        assert dec_unset(qs_empty) is UNSET
    else:
        with pytest.raises(DefaultsNotSupported):
            QueryParam("par", tdef, expected)


@pytest.mark.parametrize(
    "wrap",
    [
        pytest.param(lambda x: x, id="raw"),
        pytest.param(lambda x: Annotated[x, Meta()], id="meta"),
        pytest.param(lambda x: Annotated[x | None, Meta()], id="query"),
    ],
)
@pytest.mark.parametrize("tdef,raw", chain(*(c.iproduct() for c in tc.registry)))
def test_invalid(wrap, tdef, raw):
    if "=" not in raw:
        raw = "par=" + raw

    qs = QueryString(raw)
    tdef = wrap(tdef)
    try:
        qp = QueryParam("par", tdef)
    except DefaultsNotSupported:
        return
    with pytest.raises(Exception):
        qp.decoder(qs)
