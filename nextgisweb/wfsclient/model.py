# -*- coding: utf-8 -*-
from __future__ import division, absolute_import, print_function, unicode_literals

from lxml import etree

import requests
from osgeo import ogr
from pyramid.httpexceptions import HTTPUnauthorized, HTTPForbidden
from six import BytesIO
from zope.interface import implementer

from .. import db
from ..core.exception import ValidationError, OperationalError
from ..env import env
from ..feature_layer import (
    Feature,
    FeatureSet,
    FIELD_TYPE,
    GEOM_TYPE,
    IFeatureLayer,
    IFeatureQuery,
    LayerField,
    LayerFieldsMixin,
)
from ..geometry import geom_from_wkb
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

WFS_VERSIONS = ('1.0.0', '1.1.0', '2.0.0', '2.0.2', )


# TODO: WFS helper module
def find_tags(element, tag):
    return element.xpath('.//*[local-name()="%s"]' % tag)


def ns_trim(value):
    pos = max(value.find('}'), value.rfind(':'))
    return value[pos + 1:]


def geom_from_gml(el):
    value = etree.tostring(el)
    ogr_geom = ogr.CreateGeometryFromGML(value)
    return geom_from_wkb(ogr_geom.ExportToWkb())


def get_srid(value):
    pos = value.rfind(':')
    return int(value[pos + 1:])


class WFSConnection(Base, Resource):
    identity = COMP_ID + '_connection'
    cls_display_name = _("WFS connection")

    __scope__ = ConnectionScope

    path = db.Column(db.Unicode, nullable=False)
    version = db.Column(db.Enum(*WFS_VERSIONS), nullable=False)

    @classmethod
    def check_parent(cls, parent):
        return isinstance(parent, ResourceGroup)

    def request_wfs(self, method, **kwargs):
        if method == 'GET':
            if 'params' not in kwargs:
                kwargs['params'] = dict()
            kwargs['params']['version'] = self.version
        else:
            raise NotImplementedError()

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

    def get_feature(self, layer, get_count=False):
        params = dict(REQUEST='GetFeature', TYPENAMES=layer.layer_name)

        gt110 = self.version >= '1.1.0'
        if get_count and gt110:
            params['RESULTTYPE'] = 'hits'

        body = self.request_wfs('GET', params=params)
        root = etree.parse(BytesIO(body)).getroot()

        features = []
        count = int(root.attrib['numberMatched']) if get_count and gt110 \
            else len(find_tags(root, 'featureMember'))

        if not get_count:
            _members = find_tags(root, 'featureMember')

            features = []
            for _member in _members:
                _feature = _member[0]

                fields = dict()
                geom = None
                for _property in _feature:
                    key = ns_trim(_property.tag)
                    if key == layer.column_geom:
                        geom = geom_from_gml(_property[0])
                    if _property.attrib.get('xsi:nil', 'false') == 'true':
                        value = None
                    elif _property.text is None:
                        value = ''
                    else:
                        value = _property.text
                    fields[key] = value

                features.append(Feature(
                    layer=layer, id=_member.attrib['{http://www.opengis.net/gml/3.2}id'],  # FIXME
                    fields=fields, geom=geom
                ))

        return features, count


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


@implementer(IFeatureLayer)
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
        fdata = dict()
        for f in self.fields:
            fdata[f.keyname] = dict(
                display_name=f.display_name,
                grid_visibility=f.grid_visibility)

        for f in list(self.fields):
            self.fields.remove(f)

        self.feature_label_field = None

        for field in self.connection.get_fields(self.layer_name):
            if field['name'] == self.column_geom:
                continue

            if field['type'] == 'integer':
                datatype = FIELD_TYPE.INTEGER
            elif field['type'] == 'double':
                datatype = FIELD_TYPE.REAL
            elif field['type'] == 'string':
                datatype = FIELD_TYPE.STRING
            elif field['type'] == 'date':
                datatype = FIELD_TYPE.DATE
            elif field['type'] == 'time':
                datatype = FIELD_TYPE.time
            elif field['type'] == 'datetime':
                datatype = FIELD_TYPE.DATETIME
            else:
                raise ValidationError("Unknown data type: %s" % field['type'])

            fopts = dict(display_name=field['name'])
            fopts.update(fdata.get(field['name'], dict()))
            self.fields.append(WFSLayerField(
                keyname=field['name'],
                datatype=datatype,
                column_name=field['name'],
                **fopts))

    # IFeatureLayer

    @property
    def feature_query(self):

        class BoundFeatureQuery(FeatureQueryBase):
            layer = self

        return BoundFeatureQuery

    def field_by_keyname(self, keyname):
        for f in self.fields:
            if f.keyname == keyname:
                return f

        raise KeyError("Field '%s' not found!" % keyname)


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


@implementer(
    IFeatureQuery,
)
class FeatureQueryBase(object):

    def __init__(self):
        self._srs = None
        self._geom = False
        self._box = False

        self._fields = None
        self._limit = None
        self._offset = None

    def fields(self, *args):
        self._fields = args

    def limit(self, limit, offset=0):
        self._limit = limit
        self._offset = offset

    def geom(self):
        self._geom = True

    def srs(self, srs):
        self._srs = srs

    def box(self):
        self._box = True

    def __call__(self):
        features, count = self.layer.connection.get_feature(self.layer)

        class QueryFeatureSet(FeatureSet):
            layer = self.layer

            def __iter__(self):
                for feature in features:
                    yield feature

            @property
            def total_count(self):
                return count

        return QueryFeatureSet()
