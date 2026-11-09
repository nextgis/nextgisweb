from typing import Self

from lxml.etree import Element
from msgspec import Struct, convert, to_builtins

from nextgisweb.lib.geometry import Geometry, Transformer
from nextgisweb.lib.ows import parse_srs

from nextgisweb.spatial_ref_sys import SRS, WKT_EPSG_4326

from .util import find_tag, find_tags


class WMTSStyle(Struct):
    title: str


class WMTSLayer(Struct):
    title: str
    img_formats: list[str]
    styles: dict[str, WMTSStyle]
    bbox: tuple[float, float, float, float]
    style_default: str
    tmx_set_identifier: str


class TileMatrix(Struct):
    identifier: str
    scale_denom: float
    top: float
    left: float
    tile_width: int
    tile_height: int
    matrix_width: int
    matrix_height: int


class TileMatrixSet(Struct):
    srid: int
    tmxs: list[TileMatrix]

    def lookup(self, scale_denom: float, coeff_overzoom: float) -> TileMatrix | None:
        for tmx in reversed(self.tmxs):
            if tmx.scale_denom < scale_denom:
                if scale_denom / tmx.scale_denom > coeff_overzoom:
                    return None
                return tmx


class WMTSCapabilities(Struct):
    layers: dict[str, WMTSLayer]
    tmx_sets: dict[str, TileMatrixSet]

    @classmethod
    def from_dict(cls, data: dict) -> Self:
        return convert(data, cls)

    def to_dict(self) -> dict:
        return to_builtins(self)


def read_capabilities(root: Element) -> WMTSCapabilities:
    el_contents = find_tag(root, "Contents", must=True)

    tmx_sets = {}
    for el_tmx_set in find_tags(el_contents, "TileMatrixSet"):
        set_identifier = _text(find_tag(el_tmx_set, "Identifier", must=True))
        crs = _text(find_tag(el_tmx_set, "SupportedCRS", must=True))
        srid = parse_srs(crs)[0]

        tmxs = []
        for el_tmx in find_tags(el_tmx_set, "TileMatrix"):
            identifier = _text(find_tag(el_tmx, "Identifier", must=True))
            scale_denom = _text_float(find_tag(el_tmx, "ScaleDenominator", must=True))
            top_left_corner = _text(find_tag(el_tmx, "TopLeftCorner", must=True))
            left, top = map(float, top_left_corner.split(" ", maxsplit=1))
            tile_width = _text_int(find_tag(el_tmx, "TileWidth", must=True))
            tile_height = _text_int(find_tag(el_tmx, "TileHeight", must=True))
            matrix_width = _text_int(find_tag(el_tmx, "MatrixWidth", must=True))
            matrix_height = _text_int(find_tag(el_tmx, "MatrixHeight", must=True))
            tmxs.append(
                TileMatrix(
                    identifier=identifier,
                    scale_denom=scale_denom,
                    top=top,
                    left=left,
                    tile_width=tile_width,
                    tile_height=tile_height,
                    matrix_width=matrix_width,
                    matrix_height=matrix_height,
                )
            )
        # Sort by scale denom for quick lookup
        tmxs.sort(key=lambda tmx: tmx.scale_denom)

        tmx_sets[set_identifier] = TileMatrixSet(
            srid=srid,
            tmxs=tmxs,
        )

    layers = {}
    for el_layer in find_tags(el_contents, "Layer"):
        identifier = _text(find_tag(el_layer, "Identifier", must=True))
        title = _text(find_tag(el_layer, "Title", must=True))
        img_formats = [_text(el) for el in find_tags(el_layer, "Format")]
        el_tmx_set_link = find_tag(el_layer, "TileMatrixSetLink", must=True)
        tmx_set_identifier = _text(find_tag(el_tmx_set_link, "TileMatrixSet", must=True))
        assert tmx_set_identifier in tmx_sets

        el_bbox = find_tag(el_layer, "WGS84BoundingBox")
        if el_bbox is not None:
            bbox_epsg = 4326
        else:
            el_bbox = find_tag(el_layer, "BoundingBox")
            if el_bbox is not None:
                bbox_epsg = parse_srs(el_bbox.attrib["crs"])[0]
        if el_bbox is None:
            bbox = (-180.0, -90.0, 180.0, 90.0)
        else:
            minx, miny = map(float, _text(find_tag(el_bbox, "LowerCorner", must=True)).split(" "))
            maxx, maxy = map(float, _text(find_tag(el_bbox, "UpperCorner", must=True)).split(" "))
            bbox = (minx, miny, maxx, maxy)
            if bbox_epsg != 4326:
                bbox_geom = Geometry.from_box(*bbox)
                bbox_srs = SRS.filter_by(auth_name="EPSG", auth_srid=bbox_epsg).one()
                bbox_geom = Transformer(bbox_srs.wkt, WKT_EPSG_4326).transform(bbox_geom)
                bbox = bbox_geom.bounds

        style_default = None
        styles = {}
        for el_style in find_tags(el_layer, "Style"):
            style_identifier = _text(find_tag(el_style, "Identifier", must=True))
            if el_style.attrib["isDefault"] == "true":
                style_default = style_identifier
            if el_style_title := find_tag(el_style, "Title"):
                style_title = _text(el_style_title)
            else:
                style_title = style_identifier
            styles[style_identifier] = WMTSStyle(title=style_title)
        assert style_default is not None

        layers[identifier] = WMTSLayer(
            title=title,
            img_formats=img_formats,
            style_default=style_default,
            styles=styles,
            bbox=bbox,
            tmx_set_identifier=tmx_set_identifier,
        )

    return WMTSCapabilities(
        layers=layers,
        tmx_sets=tmx_sets,
    )


def _text(el: Element) -> str:
    text = el.text
    assert text is not None
    return text


def _text_int(el: Element) -> int:
    text = _text(el)
    return int(text)


def _text_float(el: Element) -> float:
    text = _text(el)
    return float(text)
