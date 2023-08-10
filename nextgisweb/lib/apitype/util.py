from typing import Union, get_args, get_origin

from msgspec.inspect import Metadata, type_info
from typing_extensions import _AnnotatedAlias

NoneType = type(None)


def deannotated(tdef):
    origin = get_origin(tdef)
    if origin is not None and type(tdef) is _AnnotatedAlias:
        return origin
    return tdef


def is_optional(tdef):
    tdef = deannotated(tdef)
    if get_origin(tdef) == Union:
        args = get_args(tdef)
        if NoneType in args:
            args = tuple(a for a in args if a is not NoneType)
            ntdef = args[0] if len(args) == 1 else Union[args]  # type: ignore
            return True, ntdef
    return False, tdef


def msgspec_metadata(tdef):
    tinfo = type_info(tdef)
    if isinstance(tinfo, Metadata):
        return tinfo.type, tinfo
    return tdef, Metadata(tdef)
