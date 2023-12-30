from typing import Union, get_args, get_origin

from msgspec.inspect import Metadata, type_info
from typing_extensions import Annotated, _AnnotatedAlias

NoneType = type(None)


def deannotated(tdef):
    if type(tdef) is _AnnotatedAlias and get_origin(tdef) is not None:
        return get_args(tdef)[0]
    return tdef


def expannotated(tdef):
    if type(tdef) is _AnnotatedAlias:
        return get_args(tdef)[0], getattr(tdef, "__metadata__")
    return tdef, ()


def mkannotated(tdef, annotations):
    if len(annotations) == 0:
        return tdef
    return Annotated[(tdef,) + tuple(annotations)]  # type: ignore


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
