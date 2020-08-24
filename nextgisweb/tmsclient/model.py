# -*- coding: utf-8 -*-
from __future__ import division, absolute_import, print_function, unicode_literals
from io import BytesIO
from six.moves.urllib.parse import urlparse

import PIL
from osgeo import osr, ogr
from pyramid.httpexceptions import HTTPUnauthorized, HTTPForbidden
from zope.interface import implementer

from .. import db
from ..core.exception import OperationalError, ValidationError
from ..env import env
from ..layer import SpatialLayerMixin
from ..models import declarative_base
from ..render import IExtentRenderRequest, IRenderableStyle, ITileRenderRequest
from ..resource import (
    ConnectionScope,
    DataScope,
    DataStructureScope,
    Resource,
    ResourceGroup,
    Serializer,
    SerializedProperty as SP,
    SerializedRelationship as SR,
    SerializedResourceRelationship as SRR,
)
from .util import _, crop_box, render_zoom, quad_key
from .session_keeper import get_session


Base = declarative_base()


NEXTGIS_GEOSERVICES = 'nextgis_geoservices'


class SCHEME(object):
    XYZ = 'xyz'
    TMS = 'tms'

    enum = (XYZ, TMS)


def toggle_tms_xyz_y(z, y):
    return (1 << z) - y - 1


class Connection(Base, Resource):
    identity = 'tmsclient_connection'
    cls_display_name = _('TMS connection')

    __scope__ = ConnectionScope

    capmode = db.Column(db.Enum(NEXTGIS_GEOSERVICES))
    url_template = db.Column(db.Unicode, nullable=False)
    apikey = db.Column(db.Unicode)
    apikey_param = db.Column(db.Unicode)
    scheme = db.Column(db.Enum(*SCHEME.enum), nullable=False, default=SCHEME.XYZ)

    @classmethod
    def check_parent(cls, parent):
        return isinstance(parent, ResourceGroup)

    @property
    def query_params(self):
        params = dict()
        if self.apikey:
            params[self.apikey_param or 'apikey'] = self.apikey
        return params

    def get_tile(self, tile, layer_name):
        z, x, y = tile
        if self.scheme == SCHEME.TMS:
            y = toggle_tms_xyz_y(z, y)

        session = get_session(self.id, urlparse(self.url_template).scheme)

        result = session.get(
            self.url_template.format(
                x=x, y=y, z=z,
                q=quad_key(x, y, z),
                layer=layer_name
            ),
            params=self.query_params,
            headers=env.tmsclient.headers,
            timeout=env.tmsclient.options['timeout']
        )

        if result.status_code == 200:
            return PIL.Image.open(BytesIO(result.content))
        elif result.status_code == 401:
            raise HTTPUnauthorized()
        elif result.status_code == 403:
            raise HTTPForbidden()
        elif result.status_code // 100 == 5:
            raise OperationalError("Third-party service unavailable.")
        else:
            return None


class _capmode_attr(SP):

    def setter(self, srlzr, value):
        if value is None:
            pass
        elif value == NEXTGIS_GEOSERVICES:
            srlzr.obj.url_template = env.tmsclient.options['nextgis_geoservices.url_template']
            srlzr.obj.apikey_param = 'apikey'
            srlzr.obj.scheme = SCHEME.XYZ
        else:
            raise ValidationError(message='Invalid capmode value!')

        super(_capmode_attr, self).setter(srlzr, value)


class ConnectionSerializer(Serializer):
    identity = Connection.identity
    resclass = Connection

    _defaults = dict(read=ConnectionScope.read,
                     write=ConnectionScope.write)

    url_template = SP(**_defaults)
    apikey = SP(**_defaults)
    apikey_param = SP(**_defaults)
    scheme = SP(**_defaults)

    capmode = _capmode_attr(**_defaults)


@implementer(IExtentRenderRequest, ITileRenderRequest)
class RenderRequest(object):
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
            raise ValidationError(message=_("Zoom is out of range."))
        extent = self.srs.tile_extent(tile)
        return self.style.render_image(extent, (size, size), self.srs, zoom)


@implementer(IRenderableStyle)
class Layer(Base, Resource, SpatialLayerMixin):
    identity = 'tmsclient_layer'
    cls_display_name = _('TMS layer')

    __scope__ = (DataStructureScope, DataScope)

    connection_id = db.Column(db.ForeignKey(Connection.id), nullable=False)
    layer_name = db.Column(db.Unicode)
    tilesize = db.Column(db.Integer, nullable=False, default=256)
    minzoom = db.Column(db.Integer, nullable=False, default=0)
    maxzoom = db.Column(db.Integer, nullable=False, default=14)
    extent_left = db.Column(db.Float, default=-180.0)
    extent_right = db.Column(db.Float, default=+180.0)
    extent_bottom = db.Column(db.Float, default=-90.0)
    extent_top = db.Column(db.Float, default=+90.0)

    connection = db.relationship(
        Connection, foreign_keys=connection_id,
        cascade=False, cascade_backrefs=False,
    )

    @property
    def extent(self):
        return dict(
            minLon=self.extent_left,
            maxLon=self.extent_right,
            minLat=self.extent_bottom,
            maxLat=self.extent_top,
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

        if srs.is_geographic:
            extent = (
                extent[0], max(extent[1], -85.0511),
                extent[2], min(extent[3], 85.0511),
            )

        if srs.id != self.srs.id:
            src_osr = osr.SpatialReference()
            dst_osr = osr.SpatialReference()

            src_osr.ImportFromWkt(srs.wkt)
            dst_osr.ImportFromWkt(self.srs.wkt)
            coordTrans = osr.CoordinateTransformation(src_osr, dst_osr)

            def transform(x, y):
                p = ogr.Geometry(ogr.wkbPoint)
                p.AddPoint(x, y)
                p.Transform(coordTrans)
                return (p.GetX(), p.GetY())

            extent = transform(*extent[0:2]) + transform(*extent[2:4])

        extent = (
            max(extent[0], self.srs.minx), max(extent[1], self.srs.miny),
            min(extent[2], self.srs.maxx), min(extent[3], self.srs.maxy),
        )

        xtilemin, ytilemin, xtilemax, ytilemax = self.srs.extent_tile_range(extent, zoom)

        width = (xtilemax + 1 - xtilemin) * self.tilesize
        height = (ytilemax + 1 - ytilemin) * self.tilesize

        image = PIL.Image.new('RGBA', (width, height))

        for x, xtile in enumerate(range(xtilemin, xtilemax + 1)):
            for y, ytile in enumerate(range(ytilemin, ytilemax + 1)):
                tile_image = self.connection.get_tile((zoom, xtile, ytile), self.layer_name)
                if tile_image is None:
                    continue
                image.paste(tile_image, (x * self.tilesize, y * self.tilesize))

        a0x, a1y, a1x, a0y = self.srs.tile_extent((zoom, xtilemin, ytilemin))
        b0x, b1y, b1x, b0y = self.srs.tile_extent((zoom, xtilemax, ytilemax))
        box = crop_box((a0x, b1y, b1x, a0y), extent, width, height)
        image = image.crop(box)

        if image.size != size:
            image = image.resize(size)

        return image


DataScope.read.require(
    ConnectionScope.connect,
    attr='connection', cls=Layer,
)


class LayerSerializer(Serializer):
    identity = Layer.identity
    resclass = Layer

    _defaults = dict(read=DataStructureScope.read,
                     write=DataStructureScope.write)

    connection = SRR(**_defaults)
    srs = SR(**_defaults)
    layer_name = SP(**_defaults)
    tilesize = SP(**_defaults)
    minzoom = SP(**_defaults)
    maxzoom = SP(**_defaults)
    extent_left = SP(**_defaults)
    extent_right = SP(**_defaults)
    extent_bottom = SP(**_defaults)
    extent_top = SP(**_defaults)
