from typing import (
    TYPE_CHECKING,
    Any,
    Iterable,
    Optional,
    Tuple,
    Type,
    TypeVar,
    Union,
    get_args,
    get_origin,
)

from msgspec import Struct
from msgspec import _utils as ms_utils
from msgspec.inspect import Metadata, type_info
from msgspec.inspect import _is_enum as is_enum  # noqa: F401
from msgspec.inspect import _is_struct as is_struct  # noqa: F401
from typing_extensions import Annotated, _AnnotatedAlias

get_class_annotations = ms_utils.get_class_annotations
NoneType = type(None)

T = TypeVar("T", bound=Type)


def annotate(tdef: T, annotations: Iterable[Any]) -> T:
    """Construct annotated type"""

    annotations = tuple(annotations)
    if len(annotations) == 0:
        return tdef
    return Annotated[(tdef,) + annotations]  # type: ignore


def unannotate(tdef: T) -> T:
    """Extract original type from annotated"""

    if type(tdef) is _AnnotatedAlias and get_origin(tdef) is not None:
        return get_args(tdef)[0]
    return tdef


def disannotate(tdef: T) -> Tuple[T, Tuple[Any, ...]]:
    """Disassamble annotated type to original type and annotations"""

    if type(tdef) is _AnnotatedAlias:
        return get_args(tdef)[0], getattr(tdef, "__metadata__")
    return tdef, ()


def decompose_union(tdef: Type, *, annotated: bool = True) -> Tuple[Type, ...]:
    if annotated:
        tdef = unannotate(tdef)

    if get_origin(tdef) == Union:
        return get_args(tdef)
    else:
        return (tdef,)


def is_optional(tdef: Type) -> Tuple[bool, Type]:
    """Determine if type definition is an optional type"""

    tdef = unannotate(tdef)
    if get_origin(tdef) == Union:
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
            return True, ndef
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
