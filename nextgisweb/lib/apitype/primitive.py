from builtins import type as builtins_type
from re import escape
from typing import Any, Callable, Literal, Optional, Type, TypeVar, get_args, get_origin

from msgspec import Meta, convert
from typing_extensions import Annotated

from .util import is_enum, unannotate

StringDecoder = Callable[[str], Any]

StrInt = Annotated[str, Meta(pattern=r"^-?[0-9]+$")]
StrFloat = Annotated[str, Meta(pattern=r"^-?[0-9]+(\.[0-9]+)?$")]
StrBool = Annotated[str, Meta(pattern=r"^(false|true|no|yes)$")]

SD = TypeVar("SD", bound=StringDecoder)


def string_decoder(type: Type, otype: Optional[Type] = None) -> StringDecoder:
    if otype is None:
        otype = unannotate(type)

    if otype == str:
        return _urlsafe(lambda val: convert(val, type), False)
    elif is_enum(otype):
        return _urlsafe(lambda val: convert(val, type), True)
    elif otype == int:
        return _urlsafe(lambda val: convert(int(convert(val, StrInt)), type), True)
    elif otype == float:
        return _urlsafe(lambda val: convert(float(convert(val, StrFloat)), type), True)
    elif otype == bool:
        return _urlsafe(lambda val: convert(val, StrBool) in ("true", "yes"), True)
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
        return _urlsafe(lambda val: args_type(convert(val, str_pattern)), True)
    else:
        raise TypeError(f"unsupported type: {type}")


def _urlsafe(fn: SD, value: bool) -> SD:
    setattr(fn, "urlsafe", value)
    return fn
