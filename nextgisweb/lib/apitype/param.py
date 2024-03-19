from enum import Enum
from functools import cached_property, partial
from typing import Any, Callable, Optional, Sequence, Tuple, Type, cast, get_args, get_origin

from msgspec import NODEFAULT, UNSET, UnsetType, convert
from msgspec.inspect import StructType, type_info

from . import query_string as qs
from .primitive import StringDecoder, string_decoder
from .query_string import QueryStringDecoder
from .util import (
    NoneType,
    annotate,
    decompose_union,
    disannotate,
    get_class_annotations,
    is_struct,
    unannotate,
)


def param_decoder(tdef):
    bdef = unannotate(tdef)
    if get_origin(bdef) is not list:
        return string_decoder(tdef, bdef)

    itdef = get_args(bdef)[0]
    ibdef = unannotate(itdef)
    idecode = string_decoder(itdef, ibdef)

    def _decode(val):
        vals = [idecode(i) for i in val.split(",")]
        return convert(vals, tdef)

    return _decode


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
    location: Optional[Location] = None
    name: Optional[str] = None
    spread: Optional[bool] = None

    def __init__(
        self,
        location: Optional[Location] = None,
        *,
        name: Optional[str] = None,
        spread: Optional[bool] = None,
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
    type: Type

    otype: Type
    extras: Tuple[Any, ...]
    decoder_factory: Callable[[], StringDecoder]

    def __init__(self, name: str, type: Type, *, param: Param = Path()):
        self.otype, self.extras = disannotate(type)
        param = param.replace(*self.extras)
        if (rename := param.name) is not None:
            name = rename
        self.name = name
        self.type = type

        if len(decompose_union(self.otype, annotated=False)) != 1:
            raise TypeError(f"Union in PathParam: {type}")

        self.decoder_factory = lambda: string_decoder(type, self.otype)

    @cached_property
    def decoder(self) -> StringDecoder:
        return self.decoder_factory()


class QueryParam:
    param: Param
    name: str
    type: Type
    default: Any

    otype: Type
    extras: Tuple[Any, ...]
    shape: Shape
    style: Style
    decoder_factory: Callable[[], QueryStringDecoder]

    def __init__(self, name: str, type: Type, default: Any = NODEFAULT, *, param: Param = Query()):
        rest = []
        type, extras = disannotate(type)
        param = param.replace(*extras)
        contains_none, contains_unset = False, False
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
        param = param.replace(*oextras)
        if (rename := param.name) is not None:
            name = rename

        self.param = param
        self.name = name

        self.type = annotate(otype, extras)
        self.otype = otype
        self.extras = extras + oextras
        self.default = default

        origin = get_origin(otype)
        args = get_args(otype)

        if is_struct(otype):
            self.style = Style.FORM
            self.shape = Shape.OBJECT
            self.decoder_factory = lambda: partial(
                qs.form_object,
                cls=otype,
                fields=self._struct_decoders,
            )
        elif origin is dict:
            # TODO: Support for lists
            self.style = Style.DEEP_OBJECT
            self.shape = Shape.OBJECT
            self.decoder_factory = lambda: partial(
                qs.deep_dict,
                name=self.name,
                loadk=string_decoder(args[0]),
                loadv=string_decoder(args[1]),
            )
        elif origin is list:
            self.style = Style.FORM
            self.shape = Shape.LIST
            self.decoder_factory = lambda loads=string_decoder(args[0]): partial(
                qs.form_list_list,
                name=self.name,
                type=self.type,
                default=self.default,
                loads=loads,
                urlsafe=getattr(loads, "urlsafe"),
            )
        elif origin is tuple:
            self.style = Style.FORM
            self.shape = Shape.LIST
            self.decoder_factory = lambda loads=tuple(string_decoder(a) for a in args): partial(
                qs.form_list_tuple,
                name=self.name,
                type=self.type,
                default=self.default,
                loads=loads,
                urlsafe=all(getattr(li, "urlsafe") for li in loads),
            )
        else:
            self.style = Style.FORM
            self.shape = Shape.PRIMITIVE
            self.decoder_factory = lambda: partial(
                qs.primitive,
                name=self.name,
                default=self.default,
                loads=string_decoder(self.type, otype),
            )

        if self.shape == Shape.OBJECT and (self.default is not NODEFAULT):
            raise DefaultsNotSupported

    @cached_property
    def decoder(self) -> QueryStringDecoder:
        return self.decoder_factory()

    @cached_property
    def spreaded(self) -> Sequence["QueryParam"]:
        if self.param.spread:
            assert is_struct(self.otype)
            return [qp for _, qp in self._struct_query_params]
        else:
            return [self]

    @cached_property
    def _struct_query_params(self) -> Sequence[Tuple[str, "QueryParam"]]:
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
    def _struct_decoders(self) -> Sequence[Tuple[str, QueryStringDecoder]]:
        return [(fn, qp.decoder) for fn, qp in self._struct_query_params]


class DefaultsNotSupported(TypeError):
    pass
