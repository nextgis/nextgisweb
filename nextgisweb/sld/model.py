from enum import Enum
from typing import Annotated

from lxml.builder import ElementMaker
from lxml.etree import QName, tostring
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

    def xml(self):
        _stroke = E_SE.Stroke()
        if self.color is not UNSET:
            _stroke.append(E_SE.SvgParameter(dict(name="stroke"), self.color))
        if self.opacity is not UNSET:
            _stroke.append(E_SE.SvgParameter(dict(name="stroke-opacity"), str(self.opacity)))
        if self.width is not UNSET:
            _stroke.append(E_SE.SvgParameter(dict(name="stroke-width"), str(self.width)))
        if self.dash_pattern is not UNSET:
            dp = " ".join(map(str, self.dash_pattern))
            _stroke.append(E_SE.SvgParameter(dict(name="stroke-dasharray"), dp))
            _stroke.append(E_SE.SvgParameter(dict(name="stroke-linecap"), "butt"))
        return _stroke


class Fill(Struct):
    opacity: Opacity = UNSET
    color: Color = UNSET

    def xml(self):
        _fill = E_SE.Fill()
        if self.color is not UNSET:
            _fill.append(E_SE.SvgParameter(dict(name="fill"), self.color))
        if self.opacity is not UNSET:
            _fill.append(E_SE.SvgParameter(dict(name="fill-opacity"), str(self.opacity)))
        return _fill


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

    def xml(self):
        _mark = E_SE.Mark()
        if self.well_known_name is not UNSET:
            _mark.append(E_SE.WellKnownName(self.well_known_name.value))
        if self.fill is not UNSET:
            _mark.append(self.fill.xml())
        if self.stroke is not UNSET:
            _mark.append(self.stroke.xml())
        return _mark


class Graphic(Struct):
    opacity: Opacity = UNSET
    mark: Mark | UnsetType = UNSET
    size: Size = UNSET

    def xml(self):
        _graphic = E_SE.Graphic()
        if self.opacity is not UNSET:
            _graphic.append(E_SE.Opacity(str(self.opacity)))
        if self.mark is not UNSET:
            _graphic.append(self.mark.xml())
        if self.size is not UNSET:
            _graphic.append(E_SE.Size(str(self.size)))
        return _graphic


class PointSymbolizer(Struct, tag="point"):
    graphic: Graphic

    def xml_items(self):
        return [E_SE.PointSymbolizer(self.graphic.xml())]


class LineSymbolizer(Struct, tag="line"):
    stroke: Stroke

    def xml_items(self):
        return [E_SE.LineSymbolizer(self.stroke.xml())]


class PolygonSymbolizer(Struct, tag="polygon"):
    stroke: Stroke | UnsetType = UNSET
    fill: Fill | UnsetType = UNSET

    def xml_items(self):
        result = []
        _polygon_symbolizer = E_SE.PolygonSymbolizer()
        result.append(_polygon_symbolizer)
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

    def xml(self):
        _placement = E_SE.PointPlacement()
        if self.anchor is not UNSET:
            ax = dict(l=1, c=0.5, r=0)[self.anchor[0]]
            ay = dict(t=0, c=0.5, b=1)[self.anchor[1]]
            _placement.append(
                E_SE.AnchorPoint(
                    E_SE.AnchorPointX(str(ax)),
                    E_SE.AnchorPointY(str(ay)),
                )
            )
        if self.offset is not UNSET:
            dx, dy = self.offset
            _placement.append(
                E_SE.Displacement(
                    E_SE.DisplacementX(str(dx)),
                    E_SE.DisplacementY(str(dy)),
                )
            )
        return _placement


Placement = PointPlacement


class Halo(Struct):
    radius: Size = UNSET
    fill: Fill | UnsetType = UNSET

    def xml(self):
        _halo = E_SE.Halo()
        if self.radius is not UNSET:
            _halo.append(E_SE.Radius(str(self.radius)))
        if self.fill is not UNSET:
            _halo.append(self.fill.xml())
        return _halo


class TextSymbolizer(Struct, tag="text"):
    field: str
    font_size: Size | UnsetType = UNSET
    fill: Fill | UnsetType = UNSET
    placement: Placement | UnsetType = UNSET
    halo: Halo | UnsetType = UNSET

    def xml_items(self):
        _text_symbolizer = E_SE.TextSymbolizer()
        _pn = getattr(E, f"{{{NS_OGC}}}PropertyName")(self.field)
        _text_symbolizer.append(E_SE.Label(_pn))
        if self.font_size is not UNSET:
            _text_symbolizer.append(
                E_SE.Font(E_SE.SvgParameter(dict(name="font-size"), str(self.font_size)))
            )
        if self.fill is not UNSET:
            _text_symbolizer.append(self.fill.xml())
        if self.placement is not UNSET:
            _text_symbolizer.append(E_SE.LabelPlacement(self.placement.xml()))
        if self.halo is not UNSET:
            _text_symbolizer.append(self.halo.xml())
        return [_text_symbolizer]


class Algorithm(Enum):
    StretchToMinimumMaximum = "stretch"
    ClipToMinimumMaximum = "clip"
    ClipToZero = "clip_to_zero"


class NormalizeEnhancement(Struct):
    algorithm: Algorithm
    min_value: float
    max_value: float

    def xml(self):
        return E_SE.Normalize(
            E.VendorOption(dict(name="algorithm"), self.algorithm.name),
            E.VendorOption(dict(name="minValue"), str(self.min_value)),
            E.VendorOption(dict(name="maxValue"), str(self.max_value)),
        )


class ContrastEnhancement(Struct):
    normalize: NormalizeEnhancement

    def xml(self):
        return E_SE.ContrastEnhancement(self.normalize.xml())


class Channel(Struct):
    source_channel: int
    contrast_enhancement: ContrastEnhancement | UnsetType = UNSET


class Channels(Struct):
    red: Channel | UnsetType = UNSET
    green: Channel | UnsetType = UNSET
    blue: Channel | UnsetType = UNSET

    def xml(self):
        _channel_selection = E_SE.ChannelSelection()
        for color in ("red", "green", "blue"):
            channel = getattr(self, color)
            if channel is not UNSET:
                _channel = getattr(E_SE, color.capitalize() + "Channel")(
                    E_SE.SourceChannelName(str(channel.source_channel))
                )
                if channel.contrast_enhancement is not UNSET:
                    _channel.append(channel.contrast_enhancement.xml())
                _channel_selection.append(_channel)
        return _channel_selection


class RasterSymbolizer(Struct, tag="raster"):
    channels: Channels
    opacity: Opacity = UNSET

    def xml_items(self):
        _raster_symbolizer = E_SE.RasterSymbolizer()
        if self.opacity is not UNSET:
            _raster_symbolizer.append(E_SE.Opacity(str(self.opacity)))
        _raster_symbolizer.append(self.channels.xml())
        return [_raster_symbolizer]


Symbolizer = (
    PointSymbolizer | LineSymbolizer | PolygonSymbolizer | TextSymbolizer | RasterSymbolizer
)


class Rule(Struct):
    symbolizers: Annotated[list[Symbolizer], Meta(min_length=1, max_length=1)]

    def xml(self):
        _rule = E_SE.Rule()
        for symbolizer in self.symbolizers:
            _rule.extend(symbolizer.xml_items())
        return _rule


class Style(Struct):
    rules: Annotated[list[Rule], Meta(min_length=1, max_length=2)]

    def xml(self):
        _feature_type_style = E_SE.FeatureTypeStyle()
        for rule in self.rules:
            _feature_type_style.append(rule.xml())
        return E.StyledLayerDescriptor(
            {
                QName(
                    "http://www.w3.org/2001/XMLSchema-instance", "schemaLocation"
                ): f"{NS_SLD} StyledLayerDescriptor.xsd",
                "version": "1.1.0",
            },
            E.NamedLayer(
                getattr(E, f"{{{NS_SE}}}Name")("Style"),
                E.UserStyle(_feature_type_style),
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
