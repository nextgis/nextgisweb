# -*- coding: utf-8 -*-
from __future__ import division, absolute_import, print_function, unicode_literals

import math

import PIL
import requests
from osgeo import osr, ogr
from six import BytesIO
from zope.interface import implementer

from .. import db
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
from ..spatial_ref_sys import SRS
from .util import _, crop_box, render_zoom

Base = declarative_base()


class Connection(Base, Resource):
    identity = 'tmsclient_connection'
    cls_display_name = _('TMS connection')

    __scope__ = ConnectionScope

    url_template = db.Column(db.Unicode, nullable=False)
    apikey = db.Column(db.Unicode)
    apikey_param = db.Column(db.Unicode)

    @classmethod
    def check_parent(cls, parent):
        return isinstance(parent, ResourceGroup)

    @property
    def query_params(self):
        params = dict()
        if self.apikey:
            params[self.apikey_param or 'apikey'] = self.apikey
        return params


class ConnectionSerializer(Serializer):
    identity = Connection.identity
    resclass = Connection

    _defaults = dict(read=ConnectionScope.read,
                     write=ConnectionScope.write)

    url_template = SP(**_defaults)
    apikey = SP(**_defaults)
    apikey_param = SP(**_defaults)


@implementer(IExtentRenderRequest, ITileRenderRequest)
class RenderRequest(object):
    def __init__(self, style, srs, cond):
        self.style = style
        self.srs = srs
        self.cond = cond

    def render_extent(self, extent, size):
        if self.srs.id != 4326:
            raise ValueError('EPSG:%d projection is not supported for rendering' % self.srs.id)
        return self.style.render_image(extent, size)

    def render_tile(self, tile, size):
        if self.srs.id == self.style.srs.id:
            image = self.style.get_tile(tile)

            if image.size != (size, size):
                image = image.resize((size, size))

            return image
        else:
            if self.srs.id != 4326:
                raise ValueError('EPSG:%d projection is not supported for rendering' % self.srs.id)
            extent = self.srs.tile_extent(tile)
            return self.style.render_image(extent, (size, size), zoom=tile[0])


@implementer(IRenderableStyle)
class Layer(Base, Resource, SpatialLayerMixin):
    identity = 'tmsclient_layer'
    cls_display_name = _('TMS layer')

    __scope__ = (DataStructureScope, DataScope)

    connection_id = db.Column(db.ForeignKey(Connection.id), nullable=False)
    tilesize = db.Column(db.Integer, default=256)
    maxzoom = db.Column(db.Integer, default=14)
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

    def get_tile(self, tile):
        z, x, y = tile
        result = requests.get(
            self.connection.url_template.format(x=x, y=y, z=z),
            params=self.connection.query_params,
            headers=env.tmsclient.headers,
        )

        return PIL.Image.open(BytesIO(result.content))

    def render_image(self, extent, size, zoom=None):

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

        minlon, minlat, maxlon, maxlat = extent
        minlat = max(minlat, -85.0511)
        maxlat = min(maxlat, 85.0511)

        if zoom is None:
            zoom = render_zoom(SRS.filter_by(id=4326).one(), extent, size, self.tilesize)

        src_osr = osr.SpatialReference()
        dst_osr = osr.SpatialReference()

        src_osr.ImportFromEPSG(4326)
        dst_osr.ImportFromEPSG(self.srs.id)
        coordTrans = osr.CoordinateTransformation(src_osr, dst_osr)

        def transform(lon, lat):
            p = ogr.Geometry(ogr.wkbPoint)
            p.AddPoint(lon, lat)
            p.Transform(coordTrans)
            return (p.GetX(), p.GetY())

        minx, miny = transform(minlon, minlat)
        maxx, maxy = transform(maxlon, maxlat)

        xtilemin, ytilemin, xtilemax, ytilemax = self.srs.extent_tile_range((minx, miny, maxx, maxy), zoom)

        width = (xtilemax + 1 - xtilemin) * self.tilesize
        height = (ytilemax + 1 - ytilemin) * self.tilesize

        image = PIL.Image.new('RGB', (width, height), color=None)

        for x, xtile in enumerate(range(xtilemin, xtilemax + 1)):
            for y, ytile in enumerate(range(ytilemin, ytilemax + 1)):
                tile_image = self.get_tile((zoom, xtile, ytile))
                image.paste(tile_image, (x * self.tilesize, y * self.tilesize))

        a0x, a1y, a1x, a0y = self.srs.tile_extent((zoom, xtilemin, ytilemin))
        b0x, b1y, b1x, b0y = self.srs.tile_extent((zoom, xtilemax, ytilemax))
        box = crop_box((a0x, b1y, b1x, a0y), (minx, miny, maxx, maxy), width, height)
        image = image.crop(box)

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
    tilesize = SP(**_defaults)
    maxzoom = SP(**_defaults)
    extent_left = SP(**_defaults)
    extent_right = SP(**_defaults)
    extent_bottom = SP(**_defaults)
    extent_top = SP(**_defaults)
