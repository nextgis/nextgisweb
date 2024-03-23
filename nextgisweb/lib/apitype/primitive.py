from builtins import type as builtins_type
from functools import partial
from re import escape
from typing import Any, Callable, Literal, Sequence, Tuple, get_args, get_origin
from urllib.parse import unquote

from msgspec import Meta, convert
from typing_extensions import Annotated

from .util import is_enum, unannotate

Unquoted = str
Quoted = str
StringDecoder = Callable[[Unquoted], Any]
SequenceDecoder = Callable[[Quoted], Sequence[Any]]

StrInt = Annotated[str, Meta(pattern=r"^-?[0-9]+$")]
StrFloat = Annotated[str, Meta(pattern=r"^-?[0-9]+(\.[0-9]+)?$")]
StrBool = Annotated[str, Meta(pattern=r"^(false|true|no|yes)$")]

unquote_strict = partial(unquote, errors="strict")


def string_decoder(type: Any) -> StringDecoder:
    otype = unannotate(type)

    if otype == str:
        return _urlsafe(lambda val, type=type: convert(val, type), False)
    elif is_enum(otype):
        return _urlsafe(lambda val, type=type: convert(val, type), True)
    elif otype == int:
        return _urlsafe(lambda val, type=type: convert(int(convert(val, StrInt)), type), True)
    elif otype == float:
        return _urlsafe(lambda val, type=type: convert(float(convert(val, StrFloat)), type), True)
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


def sequence_decoder(type: Any) -> SequenceDecoder:
    otype = unannotate(type)
    origin = get_origin(otype)
    if origin not in (list, tuple):
        raise NotImplementedError(type)

    args = get_args(otype)
    if origin is list or (len(args) == 2 and args[1] == Ellipsis):
        loads = string_decoder(args[0])
        urlsafe = bool(getattr(loads, "urlsafe"))
        result = partial(_homogeneous_sequence, type=type, loads=loads, urlsafe=urlsafe)
    else:
        loads = tuple(string_decoder(a) for a in args)
        urlsafe = all(getattr(sd, "urlsafe") for sd in loads)
        result = partial(_heterogeneous_sequence, type=type, loads=loads, urlsafe=urlsafe)
    return _urlsafe(result, urlsafe)


def _homogeneous_sequence(
    value: str,
    *,
    type: Any,
    loads: StringDecoder,
    urlsafe: bool,
) -> Sequence[Any]:
    if value == "":
        decoded = []
    elif urlsafe:
        # If members are marked as urlsafe, unquote the value first. It allows
        # to use values like 1%2C2%2C3 which becomes 1,2,3.
        decoded = [loads(i) for i in unquote_strict(value).split(",")]
    else:
        # Comma shouldn't be urlencoded otherwise items with commas impossible
        decoded = [loads(unquote_strict(i)) for i in value.split(",")]
    return convert(decoded, type)


def _heterogeneous_sequence(
    value: str,
    *,
    type: Any,
    loads: Tuple[StringDecoder, ...],
    urlsafe: bool,
) -> Sequence[Any]:
    if value == "":
        parts = []
    elif urlsafe:
        parts = unquote_strict(value).split(",")
    else:
        parts = [unquote_strict(i) for i in value.split(",")]

    if (pad := len(parts) - len(loads)) > 0:
        loads = loads + (str,) * pad

    return convert([ls(pt) for ls, pt in zip(loads, parts)], type)


def _urlsafe(fn, value: bool):
    setattr(fn, "urlsafe", value)
    return fn
