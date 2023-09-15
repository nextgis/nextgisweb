from enum import Enum
from typing import List, Union

import sqlalchemy as sa
from msgspec import UNSET, Meta, Struct, UnsetType, convert, to_builtins
from typing_extensions import Annotated

from nextgisweb.env import Base
from nextgisweb.lib.saext import Msgspec

Color = Union[Annotated[str, Meta(pattern=r"#[0-9A-F]{6}")], UnsetType]
Opacity = Union[Annotated[float, Meta(ge=0, le=1)], UnsetType]
Size = Union[Annotated[float, Meta(ge=0)], UnsetType]


class Stroke(Struct):
    opacity: Opacity = UNSET
    color: Color = UNSET
    width: Size = UNSET


class Fill(Struct):
    opacity: Opacity = UNSET
    color: Color = UNSET


class WellKnownName(Enum):
    SQUARE = "square"
    CIRCLE = "circle"
    TRIANGLE = "triangle"
    STAR = "star"
    CROSS = "cross"


class Mark(Struct):
    well_known_name: Union[WellKnownName, UnsetType] = UNSET
    fill: Union[Fill, UnsetType] = UNSET
    stroke: Union[Stroke, UnsetType] = UNSET


class Graphic(Struct):
    opacity: Opacity = UNSET
    mark: Union[Mark, UnsetType] = UNSET
    size: Size = UNSET


class PointSymbolizer(Struct, tag="point"):
    graphic: Graphic


class LineSymbolizer(Struct, tag="line"):
    stroke: Stroke


class PolygonSymbolizer(Struct, tag="polygon"):
    stroke: Union[Stroke, UnsetType] = UNSET
    fill: Union[Fill, UnsetType] = UNSET


Symbolizer = Union[PointSymbolizer, LineSymbolizer, PolygonSymbolizer]


class Rule(Struct):
    symbolizers: Annotated[List[Symbolizer], Meta(min_length=1, max_length=1)]


class Style(Struct):
    rules: Annotated[List[Rule], Meta(min_length=1, max_length=1)]


class SLD(Base):
    __tablename__ = "sld"

    id = sa.Column(sa.Integer, primary_key=True)
    value = sa.Column(Msgspec(Style), nullable=False)

    def serialize(self):
        return to_builtins(self.value)

    def deserialize(self, value):
        convert(value, Style)
