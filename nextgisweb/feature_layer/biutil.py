from typing import Literal

from nextgisweb.core.exception import ValidationError

BigintFormat = Literal["compat", "string", "number"]


# JavaScript can't take numbers over 53 bits without approximateness
def bigint_compat(val):
    if -(n := 2**53) <= val <= n:
        return val
    return str(val)


BIGINT_DUMPERS = dict()
BIGINT_DUMPERS["compat"] = bigint_compat
BIGINT_DUMPERS["string"] = lambda val: str(val)
BIGINT_DUMPERS["number"] = lambda val: val


def bigint_loader(val):
    match val:
        case int():
            pass
        case str():
            try:
                val = int(val)
            except ValueError:
                raise ValidationError("Can't convert string value '%s' to big integer." % val)
        case float():
            val = round(val)
        case _:
            raise ValidationError("Invalid big integer value.")

    if -(n := 2**63) <= val < n:
        return val

    raise ValidationError("Big integer value %d is out of int64 range." % val)
