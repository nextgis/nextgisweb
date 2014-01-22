# -*- coding: utf-8 -*-
import urllib
import urllib2
from io import BytesIO

from zope.interface import implements
import PIL

import sqlalchemy as sa

from ..layer import SpatialLayerMixin
from ..style import (
    IRenderableStyle,
    IExtentRenderRequest,
    ITileRenderRequest
)


def initialize(comp):

    Layer = comp.env.layer.Layer

    @Layer.registry.register
    class WMSClientLayer(Layer, SpatialLayerMixin):

        __tablename__ = 'wmsclient_layer'

        identity = __tablename__
        __mapper_args__ = dict(polymorphic_identity=identity)

        cls_display_name = u"WMS-клиент"

        layer_id = sa.Column(sa.Integer, sa.ForeignKey(Layer.id), primary_key=True)
        url = sa.Column(sa.Unicode, nullable=False)

    comp.WMSClientLayer = WMSClientLayer

    Style = comp.env.style.Style

    class RenderRequest(object):
        implements(IExtentRenderRequest, ITileRenderRequest)

        def __init__(self, style, srs):
            self.style = style
            self.srs = srs

        def render_extent(self, extent, size):
            return self.style.render_image(extent, size)

        def render_tile(self, tile, size):
            extent = self.srs.tile_extent(tile)
            return self.style.render_image(extent, (size, size))

    @Style.registry.register
    class WMSClientStyle(Style):
        implements(IRenderableStyle)

        __tablename__ = 'wmsclient_style'

        identity = __tablename__
        __mapper_args__ = dict(polymorphic_identity=identity)

        cls_display_name = u"WMS-стиль"

        style_id = sa.Column(sa.ForeignKey(Style.id), primary_key=True)
        wmslayers = sa.Column(sa.Unicode, nullable=False)

        __mapper_args__ = dict(
            polymorphic_identity=identity,
        )

        @classmethod
        def is_layer_supported(cls, layer):
            return layer.cls == 'wmsclient_layer'

        def render_request(self, srs):
            return RenderRequest(self, srs)

        def render_image(self, extent, size):
            query = dict(
                service="WMS",
                version="1.1.0",
                request="GetMap",
                layers=self.wmslayers,
                styles="",
                srs="EPSG:%d" % self.layer.srs_id,
                bbox=','.join(map(str, extent)),
                width=size[0], height=size[1],
                format="image/png32",
                transparent="true"
            )

            url = self.layer.url + "?" + urllib.urlencode(query)
            return PIL.Image.open(BytesIO(urllib2.urlopen(url).read()))

    comp.WMSClientStyle = WMSClientStyle
