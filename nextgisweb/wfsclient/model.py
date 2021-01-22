# -*- coding: utf-8 -*-
from __future__ import division, absolute_import, print_function, unicode_literals

import re
from lxml import etree

from owslib.crs import Crs
import requests
from osgeo import ogr
from pyramid.httpexceptions import HTTPUnauthorized, HTTPForbidden
from six import BytesIO, ensure_str
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
    IFeatureQueryFilterBy,
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
    ogr_geom = ogr.CreateGeometryFromGML(ensure_str(value))
    return geom_from_wkb(ogr_geom.ExportToWkb())


def get_srid(value):
    try:
        crs = Crs(value)
        return crs.code
    except:
        return None


def fid_int(fid, layer_name):
    m = re.search('^%s\.(\d+)$' % layer_name, fid)
    if m is None:
        raise ValidationError("Feature ID encoding is not supported")
    return int(m.group(1))


def fid_str(fid, layer_name):
    return '%s.%d' % (layer_name, fid)


class WFSConnection(Base, Resource):
    identity = COMP_ID + '_connection'
    cls_display_name = _("WFS connection")

    __scope__ = ConnectionScope

    path = db.Column(db.Unicode, nullable=False)
    username = db.Column(db.Unicode)
    password = db.Column(db.Unicode)
    version = db.Column(db.Enum(*WFS_VERSIONS), nullable=False)

    @classmethod
    def check_parent(cls, parent):
        return isinstance(parent, ResourceGroup)

    def request_wfs(self, method, xml_root=None, **kwargs):
        if method == 'GET':
            if 'params' not in kwargs:
                kwargs['params'] = dict()
            kwargs['params']['version'] = self.version
            kwargs['params']['service'] = 'WFS'
        elif method == 'POST':
            if xml_root is not None:
                xml_root.attrib['version'] = self.version
                xml_root.attrib['service'] = 'WFS'
                kwargs['data'] = etree.tostring(xml_root)
        else:
            raise NotImplementedError()

        if self.username is not None:
            kwargs['auth'] = requests.auth.HTTPBasicAuth(self.username, self.password)

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

        layers = []
        for el in find_tags(root, 'FeatureType'):
            srid = get_srid(find_tags(el, 'DefaultCRS')[0].text)

            is_supported = type(srid) == int
            if not is_supported:
                continue

            layers.append(dict(
                name=find_tags(el, 'Name')[0].text,
                srid=srid,
            ))

        return dict(layers=layers)

    def get_fields(self, layer_name):
        body = self.request_wfs('GET', params=dict(
            request='DescribeFeatureType', typeNames=layer_name))

        root = etree.parse(BytesIO(body)).getroot()
        cplx = find_tags(root, 'complexType')[0]

        fields = []
        for el in find_tags(cplx, 'element'):
            field_type = el.attrib.get('type')
            if field_type is None:
                restriction = find_tags(cplx, 'restriction')[0]
                field_type = restriction.attrib['base']
            if not field_type.startswith('gml:'):
                field_type = ns_trim(field_type)
            fields.append(dict(
                name=el.attrib['name'],
                type=field_type,
            ))

        return fields

    def get_feature(self, layer, fid=None, get_count=False, max_features=None):
        req_root = etree.Element('GetFeature')

        __query = etree.Element('Query', dict(typeNames=layer.layer_name))
        req_root.append(__query)

        if fid is not None:
            __filter = etree.Element('Filter')
            __query.append(__filter)
            __rid = etree.Element('ResourceId', dict(rid=fid_str(fid, layer.layer_name)))
            __filter.append(__rid)

        if get_count:
            req_root.attrib['resultType'] = 'hits'

        if max_features is not None:
            req_root.attrib['count'] = str(max_features)

        body = self.request_wfs('POST', xml_root=req_root)

        root = etree.parse(BytesIO(body)).getroot()

        features = []
        count = int(root.attrib['numberMatched'])

        if not get_count:
            _members = find_tags(root, 'member')

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

                fid = _feature.attrib['{http://www.opengis.net/gml/3.2}id']
                features.append(Feature(
                    layer=layer, id=fid_int(fid, layer.layer_name),
                    fields=fields, geom=geom
                ))

        return features, count


class WFSConnectionSerializer(Serializer):
    identity = WFSConnection.identity
    resclass = WFSConnection

    _defaults = dict(read=ConnectionScope.read,
                     write=ConnectionScope.write)

    path = SP(**_defaults)
    username = SP(**_defaults)
    password = SP(**_defaults)
    version = SP(**_defaults)


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
        # Check feature id readable
        features, count = self.connection.get_feature(self, max_features=1)

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
                datatype = FIELD_TYPE.TIME
            elif field['type'] == 'dateTime':
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

        if self.geometry_type is None:
            example_feature = features[0]
            self.geometry_type = example_feature.geom.geom_type.upper()

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
    IFeatureQueryFilterBy,
)
class FeatureQueryBase(object):

    def __init__(self):
        self._srs = None
        self._geom = False
        self._box = False

        self._fields = None
        self._limit = None
        self._offset = None

        self._filter_by = None

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

    def filter_by(self, **kwargs):
        self._filter_by = kwargs

    def __call__(self):
        fid = self._filter_by.get('id') if self._filter_by is not None else None

        features, count = self.layer.connection.get_feature(
            self.layer, fid=fid)

        class QueryFeatureSet(FeatureSet):
            layer = self.layer

            def __iter__(self):
                for feature in features:
                    yield feature

            @property
            def total_count(self):
                return count

        return QueryFeatureSet()
