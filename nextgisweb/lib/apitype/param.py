from __future__ import annotations

from collections.abc import Sequence
from enum import Enum
from functools import cached_property, partial
from typing import Any, cast, get_args, get_origin

from msgspec import NODEFAULT, UNSET, UnsetType
from msgspec.inspect import StructType, type_info

from . import query_string as qs
from .primitive import StringDecoder, sequence_decoder, string_decoder
from .query_string import QueryStringDecoder
from .util import (
    NoneType,
    annotate,
    decompose_union,
    disannotate,
    get_class_annotations,
    is_struct_type,
    unannotate,
)


class Shape(Enum):
    PRIMITIVE = "primitive"
    LIST = "list"
    OBJECT = "object"


class Style(Enum):
    FORM = "form"
    DEEP_OBJECT = "deepObject"


class Location(Enum):
    PATH = "path"
    QUERY = "query"


class Param:
    location: Location | None = None
    name: str | None = None
    spread: bool | None = None

    def __init__(
        self,
        location: Location | None = None,
        *,
        name: str | None = None,
        spread: bool | None = None,
    ):
        if location is not None:
            self.location = location
        if name is not None:
            self.name = name
        if spread is not None:
            self.spread = spread

    def replace(self, *others: Any) -> "Param":
        new = super().__new__(self.__class__)
        new.__dict__.update(self.__dict__)
        for other in others:
            if isinstance(other, Param):
                new.__dict__.update(other.__dict__)
        return new


Path = partial(Param, Location.PATH)
Query = partial(Param, Location.QUERY)


class PathParam:
    param: Param
    name: str
    type: Any

    otype: Any
    extras: tuple[Any, ...]
    decoder: StringDecoder

    def __init__(self, name: str, type: Any, *, param: Param = Path()):
        self.otype, self.extras = disannotate(type)
        param = param.replace(*self.extras)
        if (rename := param.name) is not None:
            name = rename
        self.name = name
        self.type = type

        if len(decompose_union(self.otype, annotated=False)) != 1:
            raise TypeError(f"Union in PathParam: {type}")

        self.decoder = string_decoder(type)


class QueryParam:
    param: Param
    name: str
    type: Any
    default: Any
    required: bool

    otype: Any
    extras: tuple[Any, ...]
    shape: Shape
    style: Style
    decoder: QueryStringDecoder

    def __init__(self, name: str, type: Any, default: Any = NODEFAULT, *, param: Param = Query()):
        rest = []
        type, extras = disannotate(type)
        param = param.replace(*extras)

        contains_none = contains_unset = False
        for t in decompose_union(type, annotated=False):
            u = unannotate(t)
            if u is UnsetType:
                contains_unset = True
            elif u is NoneType:
                contains_none = True
            else:
                rest.append(t)

        if contains_none and contains_unset:
            raise TypeError("None and UnsetType in union together")

        if contains_none and default is not None:
            if default is NODEFAULT:
                default = None
            else:
                raise TypeError(f"None default expected, got {default}")

        if contains_unset and default is not UNSET:
            if default is NODEFAULT:
                default = UNSET
            else:
                raise TypeError(f"UNSET default expected, got {default}")

        if len(rest) != 1:
            raise TypeError(f"Only unions of None and UnsetType supported, got {rest}")

        otype, oextras = disannotate(rest[0])
        extras = oextras + extras
        param = param.replace(*extras)
        if (rename := param.name) is not None:
            name = rename

        self.param = param
        self.name = name

        self.type = annotate(otype, extras)
        self.otype = otype
        self.extras = extras
        self.default = default
        self.required = default is NODEFAULT

        origin = get_origin(otype)
        args = get_args(otype)

        if is_struct_type(otype):
            self.style = Style.FORM
            self.shape = Shape.OBJECT
            self.decoder = partial(
                qs.form_object,
                cls=otype,
                fields=self._struct_decoders,
            )
        elif origin in (list, tuple):
            self.style = Style.FORM
            self.shape = Shape.LIST
            self.decoder = partial(
                qs.form_list,
                name=self.name,
                default=self.default,
                loads=sequence_decoder(self.type),
            )
        elif origin is dict:
            # TODO: Support for lists
            self.style = Style.DEEP_OBJECT
            self.shape = Shape.OBJECT
            self.required = False
            typek, typev = args
            loadk = string_decoder(typek)
            seq = get_origin(unannotate(typev)) in (list, tuple)
            loadv = sequence_decoder(typev) if seq else string_decoder(typev)
            self.decoder = partial(
                qs.deep_dict,
                name=self.name,
                loadk=loadk,
                loadv=loadv,
            )
        else:
            self.style = Style.FORM
            self.shape = Shape.PRIMITIVE
            self.decoder = partial(
                qs.primitive,
                name=self.name,
                default=self.default,
                loads=string_decoder(self.type),
            )

        if self.shape == Shape.OBJECT and (self.default is not NODEFAULT):
            raise DefaultsNotSupported

    @cached_property
    def spreaded(self) -> Sequence[QueryParam]:
        if self.param.spread:
            assert is_struct_type(self.otype)
            return [qp for _, qp in self._struct_query_params]
        else:
            return [self]

    @cached_property
    def _struct_query_params(self) -> Sequence[tuple[str, QueryParam]]:
        hints = get_class_annotations(self.otype)
        fields = cast(StructType, type_info(self.otype)).fields
        return [
            (
                field.name,
                QueryParam(
                    field.encode_name,
                    hints[field.name],
                    field.default,
                ),
            )
            for field in fields
        ]

    @cached_property
    def _struct_decoders(self) -> Sequence[tuple[str, QueryStringDecoder]]:
        return [(fn, qp.decoder) for fn, qp in self._struct_query_params]


class DefaultsNotSupported(TypeError):
    pass
