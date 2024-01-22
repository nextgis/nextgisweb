import enum
from typing import List, Literal, TypeVar, Union

import pytest
from msgspec import Meta, ValidationError
from typing_extensions import Annotated

from ..param import param_decoder

T = TypeVar("T")
FortyTwo = Annotated[int, Meta(ge=42, le=42)]
Positive = Annotated[T, Meta(gt=0)]
ExactlyTwo = Annotated[List[T], Meta(min_length=2, max_length=2)]
TwoOrThree = Annotated[List[T], Meta(min_length=2, max_length=3)]


class Enum(enum.Enum):
    FOO = "foo"
    BAR = "bar"


FOO = Enum.FOO
BAR = Enum.BAR

Literals = Union[Literal["foo"], Literal["bar"]]


@pytest.mark.parametrize(
    "tdef, val, expected",
    [
        [str, "", ""],
        [List[str], "", [""]],
        [str, "foo", "foo"],
        [List[str], "foo,bar", ["foo", "bar"]],
        [Annotated[str, Meta(min_length=1)], "foo", "foo"],
        [int, "000", 0],
        [FortyTwo, "42", 42],
        [List[int], "0", [0]],
        [List[int], "1,2", [1, 2]],
        [float, "3.14", 3.14],
        [float, "42", 42.0],
        [List[float], "3.14,2.71", [3.14, 2.71]],
        [bool, "true", True],
        [bool, "false", False],
        [List[bool], "false,yes", [False, True]],
        [Enum, "foo", FOO],
        [Enum, "bar", BAR],
        [ExactlyTwo[Enum], "foo,bar", [FOO, BAR]],
        [TwoOrThree[Enum], "foo,bar", [FOO, BAR]],
        [Literals, "foo", "foo"],
        [List[Literals], "foo,bar", ["foo", "bar"]],
    ],
)
def test_valid(tdef, val, expected):
    decoder = param_decoder(tdef)
    assert decoder(val) == expected


@pytest.mark.parametrize(
    "tdef, val",
    [
        [Annotated[str, Meta(min_length=5)], "foo"],
        [int, ""],
        [int, "0xFF"],
        [FortyTwo, 24],
        [List[int], "0xFF"],
        [List[FortyTwo], "24"],
        [ExactlyTwo[FortyTwo], "42,24"],
        [TwoOrThree[FortyTwo], "42"],
        [float, "1e1"],
        [Positive[float], "0"],
        [bool, "truth"],
        [bool, "0"],
        [bool, "1"],
        [Enum, "zoo"],
        [List[Enum], "foo,zoo"],
        [ExactlyTwo[Enum], "foo,bar,foo,bar"],
        [TwoOrThree[Enum], "foo,bar,foo,bar"],
        [Literals, "qux"],
    ],
)
def test_invalid(tdef, val):
    d = param_decoder(tdef)
    with pytest.raises(ValidationError):
        d(val)
