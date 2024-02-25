from typing import Any, Callable, Literal, Optional, Type, get_origin

from msgspec import Meta, convert
from typing_extensions import Annotated

from .util import is_enum, unannotate

StringDecoder = Callable[[str], Any]

StrInt = Annotated[str, Meta(pattern=r"^-?[0-9]+$")]
StrFloat = Annotated[str, Meta(pattern=r"^-?[0-9]+(\.[0-9]+)?$")]
StrBool = Annotated[str, Meta(pattern=r"^(false|true|no|yes)$")]


def string_decoder(type: Type, otype: Optional[Type] = None) -> StringDecoder:
    if otype is None:
        otype = unannotate(type)

    if otype == str or is_enum(otype) or get_origin(otype) is Literal:
        return lambda val: convert(val, type)
    elif otype == int:
        return lambda val: convert(int(convert(val, StrInt)), type)
    elif otype == float:
        return lambda val: convert(float(convert(val, StrFloat)), type)
    elif otype == bool:
        return lambda val: convert(val, StrBool) in ("true", "yes")
    else:
        raise TypeError(f"unsupported type: {type}")
