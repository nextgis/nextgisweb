from collections.abc import Iterable, Sequence
from enum import EnumMeta
from types import UnionType
from typing import TYPE_CHECKING, Annotated, Any, Literal, Union, get_args, get_origin

from msgspec import Struct
from msgspec import _utils as ms_utils
from msgspec.inspect import Metadata, type_info
from msgspec.inspect import is_struct_type as _is_struct_type

get_class_annotations = ms_utils.get_class_annotations
NoneType = type(None)


def is_struct_type(tdef: type) -> bool:
    """Determine if type definition is a msgspec.Struct type"""
    return _is_struct_type(tdef)


def is_enum_type(tdef: type) -> bool:
    """Determine if type definition is an enum.Enum type"""
    return type(tdef) is EnumMeta


def annotate[T: type](tdef: T, annotations: Sequence[Any]) -> T:
    """Construct annotated type"""

    if len(annotations) == 0:
        return tdef
    return Annotated[(tdef, *annotations)]  # ty: ignore[invalid-type-form, invalid-return-type]


def unannotate[T: type](tdef: T, *, supertype: bool = False) -> T:
    """Extract original type from annotated"""

    return disannotate(tdef, supertype=supertype)[0]


def disannotate[T: type](tdef: T, *, supertype: bool = False) -> tuple[T, tuple[Any, ...]]:
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


def decompose_union(tdef: type, *, annotated: bool = True) -> tuple[type, ...]:
    if annotated:
        tdef = unannotate(tdef)
    if get_origin(tdef) in (UnionType, Union):
        return get_args(tdef)
    else:
        return (tdef,)


def make_literal(values: Iterable[str]) -> Any:
    """Construct Literal type from sequence of string values"""

    return Literal[tuple(values)]  # ty: ignore[invalid-type-form]


def make_union(values: Iterable[type]) -> Any:
    """Construct Union type from sequence of types"""
    as_tuple = tuple(values)
    if len(as_tuple) <= 1:
        raise TypeError(f"Union must have at least two types, got {as_tuple}")
    return Union[as_tuple]


def msgspec_metadata(tdef):
    tinfo = type_info(tdef)
    if isinstance(tinfo, Metadata):
        return tinfo.type, tinfo
    return tdef, Metadata(tdef)


class EmptyObjectStruct(Struct, kw_only=True):
    pass


if TYPE_CHECKING:
    EmptyObject = EmptyObjectStruct | None
else:
    EmptyObjectStruct.__name__ = "EmptyObject"
    EmptyObject = EmptyObjectStruct
