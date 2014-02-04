# -*- coding: utf-8 -*-
import urllib
import urllib2
from io import BytesIO

from zope.interface import implements
import PIL
from owslib.wms import WebMapService

import sqlalchemy as sa

from ..models import declarative_base
from ..layer import Layer, SpatialLayerMixin
from ..style import (
    Style,
    IRenderableStyle,
    IExtentRenderRequest,
    ITileRenderRequest
)

Base = declarative_base()

WMS_VERSIONS = ('1.1.1', )


@Layer.registry.register
class WMSClientLayer(Base, Layer, SpatialLayerMixin):
    __tablename__ = 'wmsclient_layer'

    identity = __tablename__
    __mapper_args__ = dict(polymorphic_identity=identity)

    cls_display_name = u"WMS-клиент"

    layer_id = sa.Column(sa.Integer, sa.ForeignKey(Layer.id), primary_key=True)
    url = sa.Column(sa.Unicode, nullable=False)
    version = sa.Column(sa.Enum(*WMS_VERSIONS, native_enum=False), nullable=False)

    @property
    def client(self):
        if not hasattr(self, '_client'):
            self._client = WebMapService(self.url, version=self.version)
        return self._client

    @property
    def source(self):
        source_meta = super(WMSClientLayer, self).source
        source_meta.update(dict(
            url=self.url,
            version=self.version)
        )
        return source_meta


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
class WMSClientStyle(Base, Style):
    implements(IRenderableStyle)

    __tablename__ = 'wmsclient_style'

    identity = __tablename__
    __mapper_args__ = dict(polymorphic_identity=identity)

    cls_display_name = u"WMS-стиль"

    style_id = sa.Column(sa.ForeignKey(Style.id), primary_key=True)
    wmslayers = sa.Column(sa.Unicode, nullable=False)
    imgformat = sa.Column(sa.Unicode, nullable=False)

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
            format=self.imgformat,
            transparent="true"
        )

        url = self.layer.url + "?" + urllib.urlencode(query)
        return PIL.Image.open(BytesIO(urllib2.urlopen(url).read()))
