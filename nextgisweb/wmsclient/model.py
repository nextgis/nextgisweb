# -*- coding: utf-8 -*-
from __future__ import unicode_literals
import urllib
import urllib2
from io import BytesIO

from zope.interface import implements
import PIL
from owslib.wms import WebMapService

import sqlalchemy as sa
import sqlalchemy.orm as orm

from ..models import declarative_base
from ..resource import (
    Resource,
    MetaDataScope,
    Serializer,
    SerializedProperty as SP,
    SerializedRelationship as SR,
    SerializedResourceRelationship as SRR)
from ..layer import SpatialLayerMixin
from ..style import (
    IRenderableStyle,
    IExtentRenderRequest,
    ITileRenderRequest)

Base = declarative_base()


WMS_VERSIONS = ('1.1.1', )


@Resource.registry.register
class Connection(Base, MetaDataScope, Resource):
    identity = 'wmsclient_connection'
    cls_display_name = "Соединение WMS"

    resource_id = sa.Column(sa.ForeignKey(Resource.id), primary_key=True)

    url = sa.Column(sa.Unicode, nullable=False)
    version = sa.Column(sa.Enum(*WMS_VERSIONS, native_enum=False),
                        nullable=False)

    __tablename__ = identity
    __mapper_args__ = dict(polymorphic_identity=identity)

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
        source_meta = super(Connection, self).source
        source_meta.update(dict(
            url=self.url,
            version=self.version)
        )
        return source_meta


_defaults = dict(read='identify', write='identify', scope=Resource)


class ConnectionSerializer(Serializer):
    identity = Connection.identity
    resclass = Connection

    url = SP(**_defaults)
    version = SP(**_defaults)

    def deserialize(self, *args):
        super(ConnectionSerializer, self).deserialize(*args)


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
class Layer(Base, MetaDataScope, Resource, SpatialLayerMixin):
    identity = 'wmsclient_layer'
    cls_display_name = u"Cлой WMS"

    implements(IRenderableStyle)

    resource_id = sa.Column(sa.ForeignKey(Resource.id), primary_key=True)

    connection_id = sa.Column(sa.ForeignKey(Resource.id), nullable=False)
    wmslayers = sa.Column(sa.Unicode, nullable=False)
    imgformat = sa.Column(sa.Unicode, nullable=False)

    __tablename__ = identity
    __mapper_args__ = dict(
        polymorphic_identity=identity,
        inherit_condition=(resource_id == Resource.id)
    )

    connection = orm.relationship(
        Resource,
        foreign_keys=connection_id,
        cascade=False, cascade_backrefs=False)

    @classmethod
    def check_parent(self, parent):
        return parent.cls == 'resource_group'

    def render_request(self, srs):
        return RenderRequest(self, srs)

    def render_image(self, extent, size):
        query = dict(
            service="WMS",
            version="1.1.0",
            request="GetMap",
            layers=self.wmslayers,
            styles="",
            srs="EPSG:%d" % self.srs.id,
            bbox=','.join(map(str, extent)),
            width=size[0], height=size[1],
            format=self.imgformat,
            transparent="true"
        )

        url = self.connection.url + "?" + urllib.urlencode(query)
        return PIL.Image.open(BytesIO(urllib2.urlopen(url).read()))


_defaults = dict(read='view', write='edit', scope=MetaDataScope)


class LayerSerializer(Serializer):
    identity = Layer.identity
    resclass = Layer

    connection = SRR(**_defaults)
    wmslayers = SP(**_defaults)
    imgformat = SP(**_defaults)
    srs = SR(**_defaults)
