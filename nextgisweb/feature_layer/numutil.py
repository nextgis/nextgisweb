from json import dumps as json_dumps
from typing import Any, Callable, ClassVar, Literal

from nextgisweb.env import gettextf

from nextgisweb.core.exception import ValidationError

BigIntFormat = Literal["compat", "string", "number"]

MAX_SAFE_INTEGER = (1 << 53) - 1
MIN_SAFE_INTEGER = -MAX_SAFE_INTEGER

MAX_INT32 = (1 << 31) - 1
MIN_INT32 = -(1 << 31)

MAX_INT64 = (1 << 63) - 1
MIN_INT64 = -(1 << 63)


BIGINT_DUMPERS: dict[BigIntFormat, Callable] = {
    "compat": lambda val: val if (MIN_SAFE_INTEGER <= val <= MAX_SAFE_INTEGER) else str(val),
    "string": lambda val: str(val),
    "number": lambda val: val,
}


class NumberValidationError(ValidationError):
    detail_ = gettextf("The value must be within the inclusive range of {min} to {max}.")
    message_: ClassVar[str]
    minvalue: ClassVar[int]
    maxvalue: ClassVar[int]

    def __init__(self, value: Any):
        # Using the built-in json module as orjson only supports 64-bit integers
        value_json = json_dumps(value, ensure_ascii=False)
        super().__init__(
            message=self.message_.format(value_json),
            detail=self.detail_.format(min=self.minvalue, max=self.maxvalue),
        )


class IntValidationError(NumberValidationError):
    message_ = gettextf("Got an invalid INTEGER value: {}.")
    minvalue = MIN_INT32
    maxvalue = MAX_INT32


class BigIntValidationError(NumberValidationError):
    message_ = gettextf("Got an invalid BIGINT value: {}.")
    minvalue = MIN_INT64
    maxvalue = MAX_INT64


def _convert_int(val: Any) -> int:
    match val:
        case int():
            pass
        case str():
            val = int(val)
        case float():
            val = round(val)
        case _:
            raise ValueError(val)

    return val


def int_loader(val):
    try:
        val = _convert_int(val)
    except ValueError as exc:
        raise IntValidationError(val) from exc

    if MIN_INT32 <= val <= MAX_INT32:
        return val

    raise IntValidationError(val)


def bigint_loader(val):
    try:
        val = _convert_int(val)
    except ValueError as exc:
        raise BigIntValidationError(val) from exc

    if MIN_INT64 <= val <= MAX_INT64:
        return val

    raise BigIntValidationError(val)
