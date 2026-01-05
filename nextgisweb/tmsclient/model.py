import re
from io import BytesIO
from typing import Literal

import sqlalchemy as sa
import sqlalchemy.orm as orm
from msgspec import UNSET
from osgeo import ogr, osr
from PIL import Image
from zope.interface import implementer

from nextgisweb.env import Base, env, gettext
from nextgisweb.lib import saext
from nextgisweb.lib.osrhelper import sr_from_epsg

from nextgisweb.core.exception import ExternalServiceError, ValidationError
from nextgisweb.layer import IBboxLayer, SpatialLayerMixin
from nextgisweb.render import IExtentRenderRequest, IRenderableStyle, ITileRenderRequest
from nextgisweb.resource import (
    ConnectionScope,
    CRUTypes,
    DataScope,
    Resource,
    ResourceGroup,
    ResourceScope,
    SColumn,
    Serializer,
    SRelationship,
    SResource,
)

from .tile_fetcher import TileFetcher
from .util import SCHEME, crop_box, render_zoom

Base.depends_on("resource")

NEXTGIS_GEOSERVICES = "nextgis_geoservices"

url_template_pattern = re.compile(
    r"^(https?:\/\/)([a-zа-яё0-9\-._~%]+|\[[a-zа-яё0-9\-._~%!$&\'()*+,;=:]+\])+(:[0-9]+)?(\/[a-zа-яё0-9\-._~%!$&\'()*+,;=:@\{\}]+)*\/?(\?[a-zа-яё0-9\-._~%!$&\'()*+,;=:@\/\{\}?]*)?$",
    re.IGNORECASE | re.UNICODE,
)


class Connection(Resource):
    identity = "tmsclient_connection"
    cls_display_name = gettext("TMS connection")

    __scope__ = ConnectionScope

    capmode = sa.Column(saext.Enum(NEXTGIS_GEOSERVICES))
    url_template = sa.Column(sa.Unicode, nullable=False)
    apikey = sa.Column(sa.Unicode)
    apikey_param = sa.Column(sa.Unicode)
    username = sa.Column(sa.Unicode)
    password = sa.Column(sa.Unicode)
    scheme = sa.Column(saext.Enum(*SCHEME.enum), nullable=False, default=SCHEME.XYZ)
    insecure = sa.Column(sa.Boolean, nullable=False, default=False)

    @classmethod
    def check_parent(cls, parent):
        return isinstance(parent, ResourceGroup)

    @property
    def query_params(self):
        params = dict()
        if self.apikey:
            params[self.apikey_param or "apikey"] = self.apikey
        return params

    def get_tiles(self, layer_name, zoom, xmin, xmax, ymin, ymax):
        tile_fetcher = TileFetcher.instance()
        return tile_fetcher.get_tiles(self, layer_name, zoom, xmin, xmax, ymin, ymax)


class UrlTemplateAttr(SColumn):
    ctypes = CRUTypes(str | None, str, str | None)

    def set(self, srlzr: Serializer, value: str, *, create: bool):
        if value is not None:
            if not url_template_pattern.match(value):
                raise ValidationError("Invalid url template.")
            for c in "qxyz":
                tmplt_lower = f"{{{c}}}"
                if (tmplt_upper := f"{{{c.upper()}}}") in value:
                    value = value.replace(tmplt_upper, tmplt_lower)
                if tmplt_lower not in value:
                    if c != "q":
                        raise ValidationError("'{{{}}}' parameter missing.".format(c))
                elif c == "q":
                    break

        super().set(srlzr, value, create=create)


Capmode = Literal["nextgis_geoservices"] | None
Scheme = Literal[tuple(SCHEME.enum)]


class CapmodeAttr(SColumn):
    ctypes = CRUTypes(Capmode, Capmode, Capmode)

    def set(self, srlzr: Serializer, value: Capmode, *, create: bool):
        if value == NEXTGIS_GEOSERVICES:
            if srlzr.obj.id is None or srlzr.obj.capmode != NEXTGIS_GEOSERVICES:
                apikey = srlzr.data.apikey
                if apikey is UNSET or apikey is None or len(apikey) == 0:
                    raise ValidationError(message=gettext("API key required."))
            srlzr.obj.url_template = env.tmsclient.options["nextgis_geoservices.url_template"]
            srlzr.obj.apikey_param = "apikey"
            srlzr.obj.scheme = SCHEME.XYZ

        super().set(srlzr, value, create=create)


class SchemeAttr(SColumn):
    ctypes = CRUTypes(Scheme | None, Scheme, Scheme | None)


class ConnectionSerializer(Serializer, resource=Connection):
    url_template = UrlTemplateAttr(read=ConnectionScope.read, write=ConnectionScope.write)
    apikey = SColumn(read=ConnectionScope.read, write=ConnectionScope.write)
    apikey_param = SColumn(read=ConnectionScope.read, write=ConnectionScope.write)
    username = SColumn(read=ConnectionScope.read, write=ConnectionScope.write)
    password = SColumn(read=ConnectionScope.read, write=ConnectionScope.write)
    scheme = SchemeAttr(read=ConnectionScope.read, write=ConnectionScope.write)
    insecure = SColumn(read=ConnectionScope.read, write=ConnectionScope.write)

    # NOTE: The 'capmode' attribute overrides url_template and others, so it
    # must be the last. Otherwise 'url_template' can be NULL.
    capmode = CapmodeAttr(read=ConnectionScope.read, write=ConnectionScope.write)


@implementer(IExtentRenderRequest, ITileRenderRequest)
class RenderRequest:
    def __init__(self, style, srs, cond):
        self.style = style
        self.srs = srs
        self.cond = cond

    def render_extent(self, extent, size):
        zoom = render_zoom(self.srs, extent, size, self.style.tilesize)
        zoom = min(max(zoom, self.style.minzoom), self.style.maxzoom)
        return self.style.render_image(extent, size, self.srs, zoom)

    def render_tile(self, tile, size):
        zoom = tile[0]
        if zoom < self.style.minzoom or zoom > self.style.maxzoom:
            raise ValidationError(message=gettext("Zoom is out of range."))
        extent = self.srs.tile_extent(tile)
        return self.style.render_image(extent, (size, size), self.srs, zoom)


@implementer(IRenderableStyle, IBboxLayer)
class Layer(Resource, SpatialLayerMixin):
    identity = "tmsclient_layer"
    cls_display_name = gettext("TMS layer")

    __scope__ = DataScope

    connection_id = sa.Column(sa.ForeignKey(Connection.id), nullable=False)
    layer_name = sa.Column(sa.Unicode)
    tilesize = sa.Column(sa.Integer, nullable=False, default=256)
    minzoom = sa.Column(sa.Integer, nullable=False, default=0)
    maxzoom = sa.Column(sa.Integer, nullable=False, default=14)
    extent_left = sa.Column(sa.Float, default=-180.0)
    extent_right = sa.Column(sa.Float, default=+180.0)
    extent_bottom = sa.Column(sa.Float, default=-90.0)
    extent_top = sa.Column(sa.Float, default=+90.0)

    connection = orm.relationship(
        Connection,
        foreign_keys=connection_id,
        cascade="save-update, merge",
    )

    @classmethod
    def check_parent(cls, parent):
        return isinstance(parent, ResourceGroup)

    def render_request(self, srs, cond=None):
        return RenderRequest(self, srs, cond)

    def render_image(self, extent, size, srs, zoom):
        #################################
        #  ":" - requested extent
        #  "|" - received extent from TMS
        # a0_____ _____ _____ _____
        #  | ....|.....|.....|.... |
        #  | : a1|     |     |   : |
        #  |‾:‾‾‾|‾‾‾‾‾|‾‾‾‾‾|‾‾‾:‾|
        #  | :   |     |   b0|   : |
        #  |‾:‾‾‾|‾‾‾‾‾|‾‾‾‾‾|‾‾‾:‾|
        #  | ····|·····|·····|···· |
        #   ‾‾‾‾‾ ‾‾‾‾‾ ‾‾‾‾‾ ‾‾‾‾‾b1
        #################################

        def transform_extent(extent, src_osr, dst_osr):
            ct = osr.CoordinateTransformation(src_osr, dst_osr)

            def transform_point(x, y):
                p = ogr.Geometry(ogr.wkbPoint)
                p.AddPoint(x, y)
                p.Transform(ct)
                return p.GetX(), p.GetY()

            return transform_point(*extent[0:2]) + transform_point(*extent[2:4])

        def prepare_geog_extent(extent):
            return (
                extent[0],
                max(extent[1], -85.0511),
                extent[2],
                min(extent[3], 85.0511),
            )

        dst_osr = self.srs.to_osr()

        extent_max = prepare_geog_extent(
            (self.extent_left, self.extent_bottom, self.extent_right, self.extent_top)
        )
        if self.srs.id != 4326:
            wgs84_osr = sr_from_epsg(4326)
            extent_max = transform_extent(extent_max, wgs84_osr, dst_osr)

        if srs.is_geographic:
            extent = prepare_geog_extent(extent)

        if srs.id != self.srs.id:
            req_osr = srs.to_osr()
            extent = transform_extent(extent, req_osr, dst_osr)

        xtile_from, ytile_from, xtile_to, ytile_to = self.srs.extent_tile_range(extent, zoom)

        width = (xtile_to + 1 - xtile_from) * self.tilesize
        height = (ytile_to + 1 - ytile_from) * self.tilesize

        xtile_min, ytile_min, xtile_max, ytile_max = self.srs.extent_tile_range(extent_max, zoom)

        x_offset = max(xtile_min - xtile_from, 0)
        y_offset = max(ytile_min - ytile_from, 0)

        image = None

        for (x, y), tile_data in self.connection.get_tiles(
            self.layer_name,
            zoom,
            xtile_from + x_offset,
            min(xtile_to, xtile_max),
            ytile_from + y_offset,
            min(ytile_to, ytile_max),
        ):
            if tile_data is None:
                continue
            try:
                tile_image = Image.open(BytesIO(tile_data))
            except IOError:
                raise ExternalServiceError(message="Image processing error.")
            if image is None:
                image = Image.new("RGBA", (width, height))
            image.paste(
                tile_image, ((x + x_offset) * self.tilesize, (y + y_offset) * self.tilesize)
            )

        if image is not None:
            a0x, a1y, a1x, a0y = self.srs.tile_extent((zoom, xtile_from, ytile_from))
            b0x, b1y, b1x, b0y = self.srs.tile_extent((zoom, xtile_to, ytile_to))
            box = crop_box((a0x, b1y, b1x, a0y), extent, width, height)
            image = image.crop(box)

            if image.size != size:
                image = image.resize(size)

        return image

    # IBboxLayer implementation:
    @property
    def extent(self):
        return dict(
            minLon=self.extent_left,
            maxLon=self.extent_right,
            minLat=self.extent_bottom,
            maxLat=self.extent_top,
        )


DataScope.read.require(
    ConnectionScope.connect,
    attr="connection",
    cls=Layer,
)


class LayerNameAttr(SColumn):
    ctypes = CRUTypes(str | None, str | None, str | None)

    def set(self, srlzr: Serializer, value: str | None, *, create: bool):
        if srlzr.obj.id is None or srlzr.obj.layer_name != value:
            if (
                value is None or len(value) == 0
            ) and r"{layer}" in srlzr.obj.connection.url_template:
                raise ValidationError(message=gettext("Layer name required."))

        super().set(srlzr, value, create=create)


class LayerSerializer(Serializer, resource=Layer):
    connection = SResource(read=ResourceScope.read, write=ResourceScope.update)
    layer_name = LayerNameAttr(read=ResourceScope.read, write=ResourceScope.update)
    tilesize = SColumn(read=ResourceScope.read, write=ResourceScope.update)
    minzoom = SColumn(read=ResourceScope.read, write=ResourceScope.update)
    maxzoom = SColumn(read=ResourceScope.read, write=ResourceScope.update)
    extent_left = SColumn(read=ResourceScope.read, write=ResourceScope.update)
    extent_right = SColumn(read=ResourceScope.read, write=ResourceScope.update)
    extent_bottom = SColumn(read=ResourceScope.read, write=ResourceScope.update)
    extent_top = SColumn(read=ResourceScope.read, write=ResourceScope.update)
    srs = SRelationship(read=ResourceScope.read, write=ResourceScope.update)
