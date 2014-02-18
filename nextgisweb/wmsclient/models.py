# -*- coding: utf-8 -*-
import urllib
import urllib2
from io import BytesIO

from zope.interface import implements
import PIL
from owslib.wms import WebMapService

import sqlalchemy as sa

from ..models import declarative_base
from ..resource import Resource, MetaDataScope
from ..layer import SpatialLayerMixin

from ..style import (
    IRenderableStyle,
    IExtentRenderRequest,
    ITileRenderRequest)

Base = declarative_base()


WMS_VERSIONS = ('1.1.1', )


@Resource.registry.register
class WMSClientLayer(Base, MetaDataScope, Resource, SpatialLayerMixin):
    identity = 'wmsclient_layer'
    cls_display_name = u"WMS-клиент"

    __tablename__ = identity
    __mapper_args__ = dict(polymorphic_identity=identity)

    resource_id = sa.Column(sa.ForeignKey(Resource.id), primary_key=True)

    url = sa.Column(sa.Unicode, nullable=False)
    version = sa.Column(sa.Enum(*WMS_VERSIONS, native_enum=False),
                        nullable=False)

    @classmethod
    def check_parent(self, parent):
        return parent.cls == 'resource_group'

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


@Resource.registry.register
class WMSClientStyle(Base, MetaDataScope, Resource):
    identity = 'wmsclient_style'
    cls_display_name = u"WMS-стиль"

    implements(IRenderableStyle)

    __tablename__ = identity
    __mapper_args__ = dict(polymorphic_identity=identity)

    resource_id = sa.Column(sa.ForeignKey(Resource.id), primary_key=True)

    wmslayers = sa.Column(sa.Unicode, nullable=False)
    imgformat = sa.Column(sa.Unicode, nullable=False)

    @classmethod
    def check_parent(self, parent):
        return parent.cls == 'wmsclient_layer'

    def render_request(self, srs):
        return RenderRequest(self, srs)

    def render_image(self, extent, size):
        query = dict(
            service="WMS",
            version="1.1.0",
            request="GetMap",
            layers=self.wmslayers,
            styles="",
            srs="EPSG:%d" % self.parent.srs_id,
            bbox=','.join(map(str, extent)),
            width=size[0], height=size[1],
            format=self.imgformat,
            transparent="true"
        )

        url = self.parent.url + "?" + urllib.urlencode(query)
        return PIL.Image.open(BytesIO(urllib2.urlopen(url).read()))
