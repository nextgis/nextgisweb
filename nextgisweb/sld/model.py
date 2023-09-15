from enum import Enum
from typing import List, Union

import sqlalchemy as sa
from lxml.builder import ElementMaker
from lxml.etree import QName, tostring
from msgspec import UNSET, Meta, Struct, UnsetType, convert, to_builtins
from typing_extensions import Annotated

from nextgisweb.env import Base
from nextgisweb.lib.saext import Msgspec

Color = Union[Annotated[str, Meta(pattern=r"#[0-9A-F]{6}")], UnsetType]
Opacity = Union[Annotated[float, Meta(ge=0, le=1)], UnsetType]
Size = Union[Annotated[float, Meta(ge=0)], UnsetType]

NS_SLD = "http://www.opengis.net/sld"

E = ElementMaker(
    namespace=NS_SLD,
    nsmap={
        None: NS_SLD,
        "sld": NS_SLD,
        "ogc": "http://www.opengis.net/ogc",
        "se": "http://www.opengis.net/se",
        "xlink": "http://www.w3.org/1999/xlink",
    }
)


class Stroke(Struct):
    opacity: Opacity = UNSET
    color: Color = UNSET
    width: Size = UNSET

    def xml(self):
        _stroke = E.Stroke()
        if self.color is not UNSET:
            _stroke.append(E.SvgParameter(dict(name="stroke"), self.color))
        if self.opacity is not UNSET:
            _stroke.append(E.SvgParameter(dict(name="stroke-opacity"), str(self.opacity)))
        if self.width is not UNSET:
            _stroke.append(E.SvgParameter(dict(name="stroke-width"), str(self.width)))
        return _stroke

class Fill(Struct):
    opacity: Opacity = UNSET
    color: Color = UNSET

    def xml(self):
        _fill = E.Fill()
        if self.color is not None:
            _fill.append(E.SvgParameter(dict(name="fill"), self.color))
        if self.opacity is not UNSET:
            _fill.append(E.SvgParameter(dict(name="fill-opacity"), str(self.opacity)))
        return _fill


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

    def xml(self):
        _mark = E.Mark()
        if self.well_known_name is not UNSET:
            _mark.append(E.WellKnownName(self.well_known_name.value))
        if self.fill is not UNSET:
            _mark.append(self.fill.xml())
        if self.stroke is not UNSET:
            _mark.append(self.stroke.xml())
        return _mark


class Graphic(Struct):
    opacity: Opacity = UNSET
    mark: Union[Mark, UnsetType] = UNSET
    size: Size = UNSET

    def xml(self):
        _graphic = E.Graphic()
        if self.opacity is not UNSET:
            _graphic.append(E.Opacity(str(self.opacity)))
        if self.mark is not UNSET:
            _graphic.append(self.mark.xml())
        if self.size is not UNSET:
            _graphic.append(E.Size(str(self.size)))
        return _graphic


class PointSymbolizer(Struct, tag="point"):
    graphic: Graphic

    def xml(self):
        return E.PointSymbolizer(
            self.graphic.xml()
        )


class LineSymbolizer(Struct, tag="line"):
    stroke: Stroke

    def xml(self):
        return E.LineSymbolizer(
            self.stroke.xml()
        )


class PolygonSymbolizer(Struct, tag="polygon"):
    stroke: Union[Stroke, UnsetType] = UNSET
    fill: Union[Fill, UnsetType] = UNSET

    def xml(self):
        _polygon_symbolizer = E.PolygonSymbolizer()
        if self.stroke is not UNSET:
            _polygon_symbolizer.append(self.stroke.xml())
        if self.fill is not UNSET:
            _polygon_symbolizer.append(self.fill.xml())
        return _polygon_symbolizer


Symbolizer = Union[PointSymbolizer, LineSymbolizer, PolygonSymbolizer]


class Rule(Struct):
    symbolizers: Annotated[List[Symbolizer], Meta(min_length=1, max_length=1)]

    def xml(self):
        _rule = E.Rule()
        for symbolizer in self.symbolizers:
            _rule.append(symbolizer.xml())
        return _rule


class Style(Struct):
    rules: Annotated[List[Rule], Meta(min_length=1, max_length=1)]

    def xml(self):
        _feature_type_style = E.FeatureTypeStyle()
        for rule in self.rules:
            _feature_type_style.append(rule.xml())
        return E.StyledLayerDescriptor({
                QName("http://www.w3.org/2001/XMLSchema-instance", "schemaLocation"): \
                    f"{NS_SLD} StyledLayerDescriptor.xsd",
                "version": "1.1.0"
            },
            E.NamedLayer(
                E.UserStyle(
                    _feature_type_style
                )
            )
        )


class SLD(Base):
    __tablename__ = "sld"

    id = sa.Column(sa.Integer, primary_key=True)
    value = sa.Column(Msgspec(Style), nullable=False)

    def serialize(self):
        return to_builtins(self.value)

    def deserialize(self, value):
        convert(value, Style)

    def to_xml(self):
        _root = self.value.xml()
        return tostring(_root, encoding="unicode")
