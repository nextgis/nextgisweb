# -*- coding: utf-8 -*-
from __future__ import unicode_literals
import urllib
import urllib2
import json
from io import BytesIO
from datetime import datetime
from collections import namedtuple, OrderedDict

from zope.interface import implements
from lxml import etree
import PIL
from owslib.wms import WebMapService, WMSCapabilitiesReader

import sqlalchemy as sa
import sqlalchemy.orm as orm

from ..models import declarative_base
from ..resource import (
    Resource,
    ConnectionScope,
    DataStructureScope,
    DataScope,
    Serializer,
    SerializedProperty as SP,
    SerializedRelationship as SR,
    SerializedResourceRelationship as SRR,
    ValidationError)
from ..layer import SpatialLayerMixin
from ..style import (
    IRenderableStyle,
    IExtentRenderRequest,
    ITileRenderRequest)

Base = declarative_base()


WMS_VERSIONS = ('1.1.1', )


WMSLayerInfo = namedtuple('WMSLayerInfo', ('key', 'title', 'index'))


class Connection(Base, Resource):
    identity = 'wmsclient_connection'
    cls_display_name = "Соединение WMS"

    __scope__ = ConnectionScope

    url = sa.Column(sa.Unicode, nullable=False)
    version = sa.Column(sa.Enum(*WMS_VERSIONS, native_enum=False),
                        nullable=False)

    capcache_xml = sa.Column(sa.Unicode)
    capcache_json = sa.Column(sa.Unicode)
    capcache_tstamp = sa.Column(sa.DateTime)

    @classmethod
    def check_parent(self, parent):
        return parent.cls == 'resource_group'

    @property
    def client(self):
        if not hasattr(self, '_client'):
            self._client = WebMapService(self.url, version=self.version)

        return self._client

    def service(self):
        if not hasattr(self, '_service'):
            self._service = WebMapService(
                url=self.url, version=self.version,
                xml=str(self.capcache_xml))

        return self._service

    def capcache(self):
        return self.capcache_json is not None \
            and self.capcache_xml is not None \
            and self.capcache_tstamp is not None

    def capcache_query(self):
        self.capcache_tstamp = datetime.utcnow()

        reader = WMSCapabilitiesReader(self.version, url=self.url)
        self.capcache_xml = etree.tostring(reader.read(self.url))

        service = WebMapService(
            url=self.url, version=self.version,
            xml=str(self.capcache_xml))

        layers = []
        for lid, layer in service.contents.iteritems():
            layers.append(OrderedDict((
                ('id', lid), ('title', layer.title),
                ('index', map(int, layer.index.split('.'))),
            )))

        layers.sort(key=lambda i: i['index'])

        for l in layers:
            del l['index']

        data = OrderedDict((
            ('formats', service.getOperationByName('GetMap').formatOptions),
            ('layers', layers)))

        self.capcache_json = json.dumps(data, ensure_ascii=False)

    def capcache_clear(self):
        self.capcache_xml = None
        self.capcache_json = None
        self.capcache_tstamp = None

    @property
    def capcache_dict(self):
        if not self.capcache():
            return None

        return json.loads(self.capcache_json)


class _capcache_attr(SP):

    def getter(self, srlzr):
        return srlzr.obj.capcache_dict \
            if srlzr.obj.capcache() else None

    def setter(self, srlzr, value):
        if value == 'query':
            srlzr.obj.capcache_query()

        elif value == 'clear':
            srlzr.obj.capcache_clear()

        else:
            raise ValidationError('Invalid capcache value!')


class ConnectionSerializer(Serializer):
    identity = Connection.identity
    resclass = Connection

    _defaults = dict(read=ConnectionScope.read,
                     write=ConnectionScope.write)

    url = SP(**_defaults)
    version = SP(**_defaults)

    capcache = _capcache_attr(
        read=ConnectionScope.connect,
        write=ConnectionScope.connect)


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


class Layer(Base, Resource, SpatialLayerMixin):
    identity = 'wmsclient_layer'
    cls_display_name = u"Cлой WMS"

    __scope__ = (DataStructureScope, DataScope)

    implements(IRenderableStyle)

    connection_id = sa.Column(sa.ForeignKey(Resource.id), nullable=False)
    wmslayers = sa.Column(sa.Unicode, nullable=False)
    imgformat = sa.Column(sa.Unicode, nullable=False)

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


DataScope.read.require(
    ConnectionScope.connect,
    attr='connection', cls=Layer)


class LayerSerializer(Serializer):
    identity = Layer.identity
    resclass = Layer

    _defaults = dict(read=DataStructureScope.read,
                     write=DataStructureScope.write)

    connection = SRR(**_defaults)
    wmslayers = SP(**_defaults)
    imgformat = SP(**_defaults)
    srs = SR(**_defaults)
