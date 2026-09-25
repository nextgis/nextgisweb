from collections.abc import Iterable
from enum import Enum
from itertools import chain
from typing import Annotated

from lxml.builder import ElementMaker
from lxml.etree import QName, tostring
from lxml.etree import _Element as Element
from msgspec import UNSET, Meta, Struct, UnsetType, convert, to_builtins
from sqlalchemy.orm import Mapped, mapped_column

from nextgisweb.env import Base
from nextgisweb.lib.saext import Msgspec

Color = Annotated[str, Meta(pattern=r"#[0-9A-F]{6}")] | UnsetType
Opacity = Annotated[float, Meta(ge=0, le=1)] | UnsetType
Size = Annotated[float, Meta(ge=0)] | UnsetType
DashPattern = Annotated[list[Annotated[float, Meta(ge=0)]], Meta(min_length=2)] | UnsetType
Anchor = Annotated[str, Meta(pattern=r"[lcr][tcb]")] | UnsetType
Offset = Annotated[list[float], Meta(min_length=2, max_length=2)] | UnsetType

NS_SLD = "http://www.opengis.net/sld"
NS_OGC = "http://www.opengis.net/ogc"
NS_SE = "http://www.opengis.net/se"

NSMAP = {
    None: NS_SLD,
    "sld": NS_SLD,
    "ogc": NS_OGC,
    "se": NS_SE,
    "xlink": "http://www.w3.org/1999/xlink",
}

E = ElementMaker(
    namespace=NS_SLD,
    nsmap=NSMAP,
)
E_SE = ElementMaker(namespace=NS_SE)


class Stroke(Struct):
    opacity: Opacity = UNSET
    color: Color = UNSET
    width: Size = UNSET
    dash_pattern: DashPattern = UNSET

    def xml(self) -> Element:
        result = E_SE.Stroke()
        if self.color is not UNSET:
            result.append(E_SE.SvgParameter(dict(name="stroke"), self.color))
        if self.opacity is not UNSET:
            result.append(E_SE.SvgParameter(dict(name="stroke-opacity"), str(self.opacity)))
        if self.width is not UNSET:
            result.append(E_SE.SvgParameter(dict(name="stroke-width"), str(self.width)))
        if self.dash_pattern is not UNSET:
            dp = " ".join(map(str, self.dash_pattern))
            result.append(E_SE.SvgParameter(dict(name="stroke-dasharray"), dp))
            result.append(E_SE.SvgParameter(dict(name="stroke-linecap"), "butt"))
        return result


class Fill(Struct):
    opacity: Opacity = UNSET
    color: Color = UNSET

    def xml(self) -> Element:
        result = E_SE.Fill()
        if self.color is not UNSET:
            result.append(E_SE.SvgParameter(dict(name="fill"), self.color))
        if self.opacity is not UNSET:
            result.append(E_SE.SvgParameter(dict(name="fill-opacity"), str(self.opacity)))
        return result


class WellKnownName(Enum):
    SQUARE = "square"
    CIRCLE = "circle"
    TRIANGLE = "triangle"
    STAR = "star"
    CROSS = "cross"


class Mark(Struct):
    well_known_name: WellKnownName | UnsetType = UNSET
    fill: Fill | UnsetType = UNSET
    stroke: Stroke | UnsetType = UNSET

    def xml(self) -> Element:
        result = E_SE.Mark()
        if self.well_known_name is not UNSET:
            result.append(E_SE.WellKnownName(self.well_known_name.value))
        if self.fill is not UNSET:
            result.append(self.fill.xml())
        if self.stroke is not UNSET:
            result.append(self.stroke.xml())
        return result


class Graphic(Struct):
    opacity: Opacity = UNSET
    mark: Mark | UnsetType = UNSET
    size: Size = UNSET

    def xml(self) -> Element:
        result = E_SE.Graphic()
        if self.opacity is not UNSET:
            result.append(E_SE.Opacity(str(self.opacity)))
        if self.mark is not UNSET:
            result.append(self.mark.xml())
        if self.size is not UNSET:
            result.append(E_SE.Size(str(self.size)))
        return result


class PointSymbolizer(Struct, tag="point"):
    graphic: Graphic

    def xml_items(self) -> Iterable[Element]:
        return [E_SE.PointSymbolizer(self.graphic.xml())]


class LineSymbolizer(Struct, tag="line"):
    stroke: Stroke

    def xml_items(self) -> Iterable[Element]:
        return [E_SE.LineSymbolizer(self.stroke.xml())]


class PolygonSymbolizer(Struct, tag="polygon"):
    stroke: Stroke | UnsetType = UNSET
    fill: Fill | UnsetType = UNSET

    def xml_items(self) -> Iterable[Element]:
        _polygon_symbolizer = E_SE.PolygonSymbolizer()
        result = [_polygon_symbolizer]
        if self.stroke is not UNSET:
            # https://api.qgis.org/api/3.40/qgssymbollayerutils_8cpp_source.html#l02501
            if self.stroke.dash_pattern is not UNSET:
                line_symbolizer = LineSymbolizer(stroke=self.stroke)
                result.extend(line_symbolizer.xml_items())
            else:
                _polygon_symbolizer.append(self.stroke.xml())
        if self.fill is not UNSET:
            _polygon_symbolizer.append(self.fill.xml())
        return result


class PointPlacement(Struct, tag="point"):
    anchor: Anchor = UNSET
    offset: Offset = UNSET

    def xml(self) -> Element:
        result = E_SE.PointPlacement()
        if self.anchor is not UNSET:
            ax = dict(l=1, c=0.5, r=0)[self.anchor[0]]
            ay = dict(t=0, c=0.5, b=1)[self.anchor[1]]
            result.append(
                E_SE.AnchorPoint(
                    E_SE.AnchorPointX(str(ax)),
                    E_SE.AnchorPointY(str(ay)),
                )
            )
        if self.offset is not UNSET:
            dx, dy = self.offset
            result.append(
                E_SE.Displacement(
                    E_SE.DisplacementX(str(dx)),
                    E_SE.DisplacementY(str(dy)),
                )
            )
        return result


Placement = PointPlacement


class Halo(Struct):
    radius: Size = UNSET
    fill: Fill | UnsetType = UNSET

    def xml(self) -> Element:
        result = E_SE.Halo()
        if self.radius is not UNSET:
            result.append(E_SE.Radius(str(self.radius)))
        if self.fill is not UNSET:
            result.append(self.fill.xml())
        return result


class TextSymbolizer(Struct, tag="text"):
    field: str
    font_size: Size | UnsetType = UNSET
    fill: Fill | UnsetType = UNSET
    placement: Placement | UnsetType = UNSET
    halo: Halo | UnsetType = UNSET

    def xml_items(self) -> Iterable[Element]:
        result = E_SE.TextSymbolizer()
        _pn = getattr(E, f"{{{NS_OGC}}}PropertyName")(self.field)
        result.append(E_SE.Label(_pn))
        if self.font_size is not UNSET:
            result.append(
                E_SE.Font(E_SE.SvgParameter(dict(name="font-size"), str(self.font_size)))
            )
        if self.fill is not UNSET:
            result.append(self.fill.xml())
        if self.placement is not UNSET:
            result.append(E_SE.LabelPlacement(self.placement.xml()))
        if self.halo is not UNSET:
            result.append(self.halo.xml())
        return [result]


class Algorithm(Enum):
    StretchToMinimumMaximum = "stretch"
    ClipToMinimumMaximum = "clip"
    ClipToZero = "clip_to_zero"


class NormalizeEnhancement(Struct):
    algorithm: Algorithm
    min_value: float
    max_value: float

    def xml(self) -> Element:
        return E_SE.Normalize(
            E.VendorOption(dict(name="algorithm"), self.algorithm.name),
            E.VendorOption(dict(name="minValue"), str(self.min_value)),
            E.VendorOption(dict(name="maxValue"), str(self.max_value)),
        )


class ContrastEnhancement(Struct):
    normalize: NormalizeEnhancement

    def xml(self) -> Element:
        return E_SE.ContrastEnhancement(self.normalize.xml())


class Channel(Struct):
    source_channel: int
    contrast_enhancement: ContrastEnhancement | UnsetType = UNSET


class Channels(Struct):
    red: Channel | UnsetType = UNSET
    green: Channel | UnsetType = UNSET
    blue: Channel | UnsetType = UNSET

    def xml(self) -> Element:
        result = E_SE.ChannelSelection()
        for color in ("red", "green", "blue"):
            channel = getattr(self, color)
            if channel is not UNSET:
                _channel = getattr(E_SE, color.capitalize() + "Channel")(
                    E_SE.SourceChannelName(str(channel.source_channel))
                )
                if channel.contrast_enhancement is not UNSET:
                    _channel.append(channel.contrast_enhancement.xml())
                result.append(_channel)
        return result


class RasterSymbolizer(Struct, tag="raster"):
    channels: Channels
    opacity: Opacity = UNSET

    def xml_items(self) -> Iterable[Element]:
        result = E_SE.RasterSymbolizer()
        if self.opacity is not UNSET:
            result.append(E_SE.Opacity(str(self.opacity)))
        result.append(self.channels.xml())
        return [result]


Symbolizer = (
    PointSymbolizer | LineSymbolizer | PolygonSymbolizer | TextSymbolizer | RasterSymbolizer
)


class Rule(Struct):
    symbolizers: Annotated[list[Symbolizer], Meta(min_length=1, max_length=1)]

    def xml(self) -> Element:
        return E_SE.Rule(*chain.from_iterable(i.xml_items() for i in self.symbolizers))


class Style(Struct):
    rules: Annotated[list[Rule], Meta(min_length=1, max_length=2)]

    def xml(self) -> Element:
        xsi_schema_location = QName("http://www.w3.org/2001/XMLSchema-instance", "schemaLocation")
        return E.StyledLayerDescriptor(
            # ty: ignore[invalid-argument-type]
            {
                xsi_schema_location: f"{NS_SLD} StyledLayerDescriptor.xsd",
                "version": "1.1.0",
            },
            E.NamedLayer(
                getattr(E, f"{{{NS_SE}}}Name")("Style"),
                E.UserStyle(
                    E_SE.FeatureTypeStyle(
                        *(rule.xml() for rule in self.rules),
                    ),
                ),
            ),
        )


class SLD(Base):
    __tablename__ = "sld"

    id: Mapped[int] = mapped_column(primary_key=True)
    value: Mapped[Style] = mapped_column(Msgspec(Style))

    def serialize(self):
        return to_builtins(self.value)

    def deserialize(self, value):
        self.value = convert(value, Style)

    def to_xml(self):
        _root = self.value.xml()
        return tostring(_root, encoding="unicode")
