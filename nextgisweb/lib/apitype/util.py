from types import UnionType
from typing import (
    TYPE_CHECKING,
    Annotated,
    Any,
    Iterable,
    Optional,
    Tuple,
    Type,
    TypeVar,
    Union,
    cast,
    get_args,
    get_origin,
)

from msgspec import Struct
from msgspec import _utils as ms_utils
from msgspec.inspect import Metadata, type_info
from msgspec.inspect import _is_enum as is_enum  # noqa: F401
from msgspec.inspect import _is_struct as is_struct  # noqa: F401

get_class_annotations = ms_utils.get_class_annotations
NoneType = type(None)

T = TypeVar("T", bound=Type)


def annotate(tdef: T, annotations: Iterable[Any]) -> T:
    """Construct annotated type"""

    annotations = tuple(annotations)
    if len(annotations) == 0:
        return tdef
    return Annotated[(tdef,) + annotations]  # type: ignore


def unannotate(tdef: T, *, supertype: bool = False) -> T:
    """Extract original type from annotated"""

    return disannotate(tdef, supertype=supertype)[0]


def disannotate(tdef: T, *, supertype: bool = False) -> Tuple[T, Tuple[Any, ...]]:
    """Disassamble annotated type to original type and annotations"""

    if supertype and (sdef := getattr(tdef, "__supertype__", None)):
        tdef = sdef

    if get_origin(tdef) is Annotated:
        result_type, *result_extras = get_args(tdef)
        result_extras = tuple(result_extras)
        if supertype:
            result_type, supertype_extras = disannotate(result_type, supertype=True)
            result_extras = supertype_extras + result_extras

        return result_type, result_extras

    return tdef, ()


def decompose_union(tdef: Type, *, annotated: bool = True) -> Tuple[Type, ...]:
    if annotated:
        tdef = unannotate(tdef)

    if get_origin(tdef) in (UnionType, Union):
        return get_args(tdef)
    else:
        return (tdef,)


def is_optional(tdef: Type) -> Tuple[bool, Type]:
    """Determine if type definition is an optional type"""

    tdef = unannotate(tdef)
    if get_origin(tdef) in (UnionType, Union):
        result = (False,)
        args = []
        for a in get_args(tdef):
            u = unannotate(a)
            if u is NoneType:
                result = True
            else:
                args.append(a)
        if result:
            ndef = args[0] if len(args) == 1 else Union[tuple(args)]  # type: ignore
            return True, cast(Type, ndef)
    return False, tdef


def msgspec_metadata(tdef):
    tinfo = type_info(tdef)
    if isinstance(tinfo, Metadata):
        return tinfo.type, tinfo
    return tdef, Metadata(tdef)


class EmptyObjectStruct(Struct, kw_only=True):
    pass


if TYPE_CHECKING:
    EmptyObject = Optional[EmptyObjectStruct]
else:
    EmptyObjectStruct.__name__ = "EmptyObject"
    EmptyObject = EmptyObjectStruct
