# -*- coding: utf-8 -*-
from __future__ import division, absolute_import, print_function, unicode_literals

from lxml import etree

import requests
from pyramid.httpexceptions import HTTPUnauthorized, HTTPForbidden
from six import BytesIO
from zope.interface import implementer

from .. import db
from ..core.exception import OperationalError
from ..env import env
from ..feature_layer import (
    GEOM_TYPE,
    IFeatureLayer,
    IWritableFeatureLayer,
    LayerField,
    LayerFieldsMixin,
)
from ..layer import SpatialLayerMixin
from ..models import declarative_base
from ..resource import (
    ConnectionScope,
    DataScope,
    DataStructureScope,
    ForbiddenError,
    Resource,
    ResourceError,
    ResourceGroup,
    SerializedProperty as SP,
    SerializedRelationship as SR,
    SerializedResourceRelationship as SRR,
    Serializer,
)

from .util import _, COMP_ID

Base = declarative_base()

layer_identity = COMP_ID + '_layer'


def find_tags(element, tag):
    return element.xpath('.//*[local-name()="%s"]' % tag)


def get_srid(value):
    pos = value.rfind(':')
    return int(value[pos + 1:])


class WFSConnection(Base, Resource):
    identity = COMP_ID + '_connection'
    cls_display_name = _("WFS connection")

    __scope__ = ConnectionScope

    path = db.Column(db.Unicode, nullable=False)

    @classmethod
    def check_parent(cls, parent):
        return isinstance(parent, ResourceGroup)

    def request_wfs(self, method, **kwargs):
        response = requests.request(
            method, self.path,
            headers=env.wfsclient.headers,
            timeout=env.wfsclient.options['timeout'],
            **kwargs
        )

        if response.status_code // 100 == 2:
            return response.content
        elif response.status_code == 401:
            raise HTTPUnauthorized()
        elif response.status_code == 403:
            raise HTTPForbidden()
        elif response.status_code // 100 == 5:
            raise OperationalError("Third-party service unavailable.")
        else:
            return None

    def get_capabilities(self):
        body = self.request_wfs('GET', params=dict(REQUEST='GetCapabilities'))

        root = etree.parse(BytesIO(body)).getroot()

        layers = [dict(
            name=find_tags(el, 'Name')[0].text,
            srid=get_srid(find_tags(el, 'SRS')[0].text),
        ) for el in find_tags(root, 'FeatureType')]

        return dict(layers=layers)

    def get_fields(self, layer_name):
        body = self.request_wfs('GET', params=dict(
            REQUEST='DescribeFeatureType', TYPENAMES=layer_name))

        root = etree.parse(BytesIO(body)).getroot()
        cplx = find_tags(root, 'complexType')[0]

        fields = [dict(
            name=el.attrib['name'],
            type=el.attrib['type'],
        ) for el in find_tags(cplx, 'element')]

        return fields


class WFSConnectionSerializer(Serializer):
    identity = WFSConnection.identity
    resclass = WFSConnection

    path = SP(read=ConnectionScope.read, write=ConnectionScope.write)


class WFSLayerField(Base, LayerField):
    identity = layer_identity

    __tablename__ = LayerField.__tablename__ + '_' + identity
    __mapper_args__ = dict(polymorphic_identity=identity)

    id = db.Column(db.ForeignKey(LayerField.id), primary_key=True)
    column_name = db.Column(db.Unicode, nullable=False)


@implementer(IFeatureLayer, IWritableFeatureLayer)
class WFSLayer(Base, Resource, SpatialLayerMixin, LayerFieldsMixin):
    identity = layer_identity
    cls_display_name = _("WFS layer")

    __scope__ = DataScope

    connection_id = db.Column(db.ForeignKey(WFSConnection.id), nullable=False)
    layer_name = db.Column(db.Unicode, nullable=False)
    column_geom = db.Column(db.Unicode, nullable=False)
    geometry_type = db.Column(db.Enum(*GEOM_TYPE.enum), nullable=False)
    geometry_srid = db.Column(db.Integer, nullable=False)

    __field_class__ = WFSLayerField

    connection = db.relationship(
        WFSConnection, foreign_keys=connection_id,
        cascade=False, cascade_backrefs=False,
    )

    @classmethod
    def check_parent(cls, parent):
        return isinstance(parent, ResourceGroup)

    def setup(self):
        pass  # TODO

    # IFeatureLayer

    @property
    def feature_query(self):
        pass  # TODO

    def field_by_keyname(self, keyname):
        for f in self.fields:
            if f.keyname == keyname:
                return f

        raise KeyError("Field '%s' not found!" % keyname)

    # IWritableFeatureLayer

    def feature_create(self, feature):
        pass  # TODO

    def feature_delete(self, feature_id):
        pass  # TODO

    def feature_delete_all(self):
        pass  # TODO

    def feature_put(self, feature):
        pass  # TODO


class _fields_action(SP):
    """ Special write-only attribute that allows updating
    list of fields from the server """

    def setter(self, srlzr, value):
        if value == 'update':
            if srlzr.obj.connection.has_permission(ConnectionScope.connect, srlzr.user):
                srlzr.obj.setup()
            else:
                raise ForbiddenError()
        elif value != 'keep':
            raise ResourceError()


class WFSLayerSerializer(Serializer):
    identity = WFSLayer.identity
    resclass = WFSLayer

    __defaults = dict(read=DataStructureScope.read, write=DataStructureScope.write)

    connection = SRR(**__defaults)
    srs = SR(**__defaults)

    layer_name = SP(**__defaults)
    column_geom = SP(**__defaults)
    geometry_type = SP(**__defaults)
    geometry_srid = SP(**__defaults)

    fields = _fields_action(write=DataStructureScope.write)

    def deserialize(self):
        self.data['srs'] = dict(id=3857)
        super(self.__class__, self).deserialize()
