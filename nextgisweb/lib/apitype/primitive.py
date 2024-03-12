from builtins import type as builtins_type
from re import escape
from typing import Any, Callable, Literal, Optional, Type, get_args, get_origin

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

    if otype == str or is_enum(otype):
        return lambda val: convert(val, type)
    elif otype == int:
        return lambda val: convert(int(convert(val, StrInt)), type)
    elif otype == float:
        return lambda val: convert(float(convert(val, StrFloat)), type)
    elif otype == bool:
        return lambda val: convert(val, StrBool) in ("true", "yes")
    elif get_origin(otype) is Literal:
        args = get_args(otype)
        types = set(builtins_type(a) for a in args)
        if len(types) > 1:
            raise TypeError(f"{otype} is not uniform")
        pattern = "^" + "|".join(escape(str(a)) for a in args) + "$"
        str_pattern = Annotated[str, Meta(pattern=pattern)]
        args_type = tuple(types)[0]
        if args_type not in (str, int):
            raise TypeError(f"unsupported type {args_type} in {otype}")
        return lambda val: args_type(convert(val, str_pattern))
    else:
        raise TypeError(f"unsupported type: {type}")
