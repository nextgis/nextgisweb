from enum import EnumMeta
from typing import Union, get_args, get_origin

from msgspec import Meta, convert
from typing_extensions import Annotated

from .util import deannotated

_INT_STR = Annotated[str, Meta(pattern=r"^-?[0-9]+$")]
_FLOAT_STR = Annotated[str, Meta(pattern=r"^-?[0-9]+(\.[0-9]+)?$")]
_BOOL_STR = Annotated[str, Meta(pattern=r"^(false|true|no|yes)$")]


def _decode_bool(val):
    return convert(val, _BOOL_STR) in ("true", "yes")


def item_decoder(tdef, bdef):
    if bdef == str or type(bdef) is EnumMeta or get_origin(bdef) is Union:

        def _decode(val):
            return convert(val, tdef)

    elif bdef == int:

        def _decode(val):
            return convert(int(convert(val, _INT_STR)), tdef)

    elif bdef == float:

        def _decode(val):
            return convert(float(convert(val, _FLOAT_STR)), tdef)

    elif bdef == bool:
        _decode = _decode_bool

    else:
        raise TypeError(f"unsupported type: {tdef}")

    return _decode


def param_decoder(tdef):
    bdef = deannotated(tdef)
    if get_origin(bdef) is not list:
        return item_decoder(tdef, bdef)

    itdef = get_args(bdef)[0]
    ibdef = deannotated(itdef)
    idecode = item_decoder(itdef, ibdef)

    def _decode(val):
        vals = [idecode(i) for i in val.split(",")]
        return convert(vals, tdef)

    return _decode
