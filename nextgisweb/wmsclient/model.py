# -*- coding: utf-8 -*-
from __future__ import unicode_literals
import requests
import json
from io import BytesIO
from datetime import datetime
from collections import OrderedDict

from zope.interface import implementer
from lxml import etree
import PIL
from owslib.wms import WebMapService
from owslib.map.common import WMSCapabilitiesReader
from pyramid.url import urlencode

from .. import db
from ..env import env
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
    ValidationError,
    ResourceGroup)
from ..layer import SpatialLayerMixin
from ..render import (
    IRenderableStyle,
    IExtentRenderRequest,
    ITileRenderRequest)

from .util import _

Base = declarative_base()

WMS_VERSIONS = ('1.1.1', '1.3.0')


class Connection(Base, Resource):
    identity = 'wmsclient_connection'
    cls_display_name = _("WMS connection")

    __scope__ = ConnectionScope

    url = db.Column(db.Unicode, nullable=False)
    version = db.Column(db.Enum(*WMS_VERSIONS), nullable=False)
    username = db.Column(db.Unicode)
    password = db.Column(db.Unicode)

    capcache_xml = db.deferred(db.Column(db.Unicode))
    capcache_json = db.deferred(db.Column(db.Unicode))
    capcache_tstamp = db.Column(db.DateTime)

    @classmethod
    def check_parent(cls, parent):
        return isinstance(parent, ResourceGroup)

    def capcache(self):
        return self.capcache_json is not None \
            and self.capcache_xml is not None \
            and self.capcache_tstamp is not None

    def capcache_query(self):
        self.capcache_tstamp = datetime.utcnow()
        reader = WMSCapabilitiesReader(self.version, url=self.url,
                                       un=self.username,
                                       pw=self.password,
                                       headers=env.wmsclient.headers)
        self.capcache_xml = etree.tostring(reader.read(self.url))

        service = WebMapService(
            url=self.url, version=self.version,
            username=self.username,
            password=self.password,
            xml=str(self.capcache_xml))

        layers = []
        for lid, layer in service.contents.items():
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
    username = SP(**_defaults)
    password = SP(**_defaults)

    capcache = _capcache_attr(
        read=ConnectionScope.connect,
        write=ConnectionScope.connect)


@implementer(IExtentRenderRequest, ITileRenderRequest)
class RenderRequest(object):

    def __init__(self, style, srs, cond):
        self.style = style
        self.srs = srs
        self.cond = cond

    def render_extent(self, extent, size):
        return self.style.render_image(extent, size)

    def render_tile(self, tile, size):
        extent = self.srs.tile_extent(tile)
        return self.style.render_image(extent, (size, size))


@implementer(IRenderableStyle)
class Layer(Base, Resource, SpatialLayerMixin):
    identity = 'wmsclient_layer'
    cls_display_name = _("WMS layer")

    __scope__ = (DataStructureScope, DataScope)

    connection_id = db.Column(db.ForeignKey(Resource.id), nullable=False)
    wmslayers = db.Column(db.Unicode, nullable=False)
    imgformat = db.Column(db.Unicode, nullable=False)

    connection = db.relationship(
        Resource, foreign_keys=connection_id,
        cascade=False, cascade_backrefs=False)

    @classmethod
    def check_parent(cls, parent):
        return isinstance(parent, ResourceGroup)

    def render_request(self, srs, cond=None):
        return RenderRequest(self, srs, cond)

    def render_image(self, extent, size):
        query = dict(
            service="WMS",
            request="GetMap",
            version=self.connection.version,
            layers=self.wmslayers,
            styles="",
            format=self.imgformat,
            bbox=",".join(map(str, extent)),
            width=size[0],
            height=size[1],
            transparent="true",
        )

        # Vendor-specific parameters
        for p in self.vendor_params:
            query[p.key] = p.value

        # In the GetMap operation the srs parameter is called crs in 1.3.0.
        srs = 'crs' if self.connection.version == '1.3.0' else 'srs'
        query[srs] = "EPSG:%d" % self.srs.id

        auth = None
        username = self.connection.username
        password = self.connection.password
        if username and password:
            auth = (username, password)

        sep = "&" if "?" in self.connection.url else "?"

        # ArcGIS server requires that space is url-encoded as "%20"
        # but it does not accept space encoded as "+".
        # It is always safe to replace spaces with "%20".
        url = (
            self.connection.url
            + sep
            + urlencode(query).replace("+", "%20")
        )

        return PIL.Image.open(BytesIO(requests.get(
            url, auth=auth, headers=env.wmsclient.headers).content))


class LayerVendorParam(Base):
    __tablename__ = 'wmsclient_layer_vendor_param'

    resource_id = db.Column(db.ForeignKey(Resource.id), primary_key=True)
    key = db.Column(db.Unicode(255), primary_key=True)
    value = db.Column(db.Unicode)

    resource = db.relationship(Resource, backref=db.backref(
        'vendor_params', cascade='all, delete-orphan'))


class _vendor_params_attr(SP):

    def getter(self, srlzr):
        result = {}

        for itm in getattr(srlzr.obj, 'vendor_params'):
            result[itm.key] = itm.value

        return result

    def setter(self, srlzr, value):
        odata = getattr(srlzr.obj, 'vendor_params')

        rml = []     # Records to be removed
        imap = {}    # Records to be rewritten

        for i in odata:
            if i.key in value and value[i.key] is not None:
                imap[i.key] = i
            else:
                rml.append(i)

        # Remove records to be removed
        map(lambda i: odata.remove(i), rml)

        for k, val in value.items():
            if val is None:
                continue

            itm = imap.get(k)

            if itm is None:
                # Create new record if there is no record to rewrite
                itm = LayerVendorParam(key=k)
                odata.append(itm)

            itm.value = val


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

    vendor_params = _vendor_params_attr(**_defaults)
