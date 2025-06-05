from json import dumps as json_dumps
from typing import Any, Callable, Literal

from nextgisweb.env import gettextf

from nextgisweb.core.exception import ValidationError

BigIntFormat = Literal["compat", "string", "number"]

MAX_SAFE_INTEGER = (1 << 53) - 1
MIN_SAFE_INTEGER = -MAX_SAFE_INTEGER

MAX_INT64 = (1 << 63) - 1
MIN_INT64 = -(1 << 63)


BIGINT_DUMPERS: dict[BigIntFormat, Callable] = {
    "compat": lambda val: val if (MIN_SAFE_INTEGER <= val <= MAX_SAFE_INTEGER) else str(val),
    "string": lambda val: str(val),
    "number": lambda val: val,
}


class BigIntValidationError(ValidationError):
    message_ = gettextf("Got an invalid BIGINT value: {}.")
    detail_ = gettextf("The value must be within the inclusive range of {min} to {max}.")

    def __init__(self, value: Any):
        # Using the built-in json module as orjson only supports 64-bit integers
        value_json = json_dumps(value, ensure_ascii=False)
        super().__init__(
            message=self.message_.format(value_json),
            detail=self.detail_.format(min=MIN_INT64, max=MAX_INT64),
        )


def bigint_loader(val):
    match val:
        case int():
            pass
        case str():
            try:
                val = int(val)
            except ValueError as exc:
                raise BigIntValidationError(val) from exc
        case float():
            val = round(val)
        case _:
            raise BigIntValidationError(val)

    if MIN_INT64 <= val <= MAX_INT64:
        return val

    raise BigIntValidationError(val)
