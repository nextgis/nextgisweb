import re
from datetime import date, datetime, time
from io import BytesIO

from lxml import etree
from owslib.crs import Crs
import requests
from osgeo import ogr, osr
from pyramid.httpexceptions import HTTPUnauthorized, HTTPForbidden
from shapely.geometry import box
from zope.interface import implementer

from .. import db
from ..core.exception import ForbiddenError, ValidationError, OperationalError
from ..env import env
from ..feature_layer import (
    Feature,
    FeatureQueryIntersectsMixin,
    FeatureSet,
    FIELD_TYPE,
    GEOM_TYPE,
    IFeatureLayer,
    IFeatureQuery,
    IFeatureQueryFilter,
    IFeatureQueryFilterBy,
    IFeatureQueryIntersects,
    LayerField,
    LayerFieldsMixin,
)
from ..layer import SpatialLayerMixin
from ..lib.geometry import Geometry
from ..lib.ows import FIELD_TYPE_WFS
from ..models import declarative_base
from ..resource import (
    ConnectionScope,
    DataScope,
    DataStructureScope,
    Resource,
    ResourceGroup,
    SerializedProperty as SP,
    SerializedRelationship as SR,
    SerializedResourceRelationship as SRR,
    Serializer,
)
from ..spatial_ref_sys import SRS

from .util import _, COMP_ID

WFS_2_FIELD_TYPE = {
    FIELD_TYPE_WFS.INTEGER: FIELD_TYPE.INTEGER,
    FIELD_TYPE_WFS.LONG: FIELD_TYPE.BIGINT,
    FIELD_TYPE_WFS.DOUBLE: FIELD_TYPE.REAL,
    FIELD_TYPE_WFS.STRING: FIELD_TYPE.STRING,
    FIELD_TYPE_WFS.DATE: FIELD_TYPE.DATE,
    FIELD_TYPE_WFS.TIME: FIELD_TYPE.TIME,
    FIELD_TYPE_WFS.DATETIME: FIELD_TYPE.DATETIME,
}

LOGICAL_OPERATORS = {
    'eq': 'PropertyIsEqualTo',
    'ne': 'PropertyIsNotEqualTo',
    'gt': 'PropertyIsGreaterThan',
    'ge': 'PropertyIsGreaterThanOrEqualTo',
    'lt': 'PropertyIsLessThan',
    'le': 'PropertyIsLessThanOrEqualTo',
}

Base = declarative_base()

layer_identity = COMP_ID + '_layer'

WFS_VERSIONS = ('1.0.0', '1.1.0', '2.0.0', '2.0.2', )

url_pattern = re.compile(r'^(https?:\/\/)([a-zа-яё0-9\-._~%]+|\[[a-zа-яё0-9\-._~%!$&\'()*+,;=:]+\])+(:[0-9]+)?(\/[a-zа-яё0-9\-._~%!$&\'()*+,;=:@]+)*\/?(\?[a-zа-яё0-9\-._~%!$&\'()*+,;=:@\/?]*)?$', re.IGNORECASE | re.UNICODE)  # NOQA


# TODO: WFS helper module
def find_tags(element, tag):
    return element.xpath('.//*[local-name()="%s"]' % tag)


def ns_trim(value):
    pos = max(value.find('}'), value.rfind(':'))
    return value[pos + 1:]


def geom_from_gml(el):
    value = etree.tostring(el, encoding='utf-8')
    ogr_geom = ogr.CreateGeometryFromGML(value.decode('utf-8'))
    return Geometry.from_ogr(ogr_geom)


def get_srid(value):
    try:
        crs = Crs(value)
        return crs.code
    except:
        return None


def fid_int(fid, layer_name):
    m = re.search(r'^%s\.(\d+)$' % layer_name, fid)
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

    def get_feature(self, layer, fid=None, filter_=None, intersects=None, propertyname=None,
                    get_count=False, limit=None, offset=None, srs=None, add_box=False):
        req_root = etree.Element('GetFeature')

        __query = etree.Element('Query', dict(typeNames=layer.layer_name))
        req_root.append(__query)

        # Filter {
        __filter = etree.Element('Filter')

        if fid is not None:
            __rid = etree.Element('ResourceId', dict(rid=fid_str(fid, layer.layer_name)))
            __filter.append(__rid)

        if filter_ is not None:
            __and = etree.Element('And')
            for k, o, v in filter_:
                if o not in LOGICAL_OPERATORS.keys():
                    raise ValidationError("Operator '%s' is not supported." % o)
                __op = etree.Element(LOGICAL_OPERATORS[o])
                __value_reference = etree.Element('ValueReference')
                __value_reference.text = k
                __op.append(__value_reference)
                __literal = etree.Element('Literal')
                __literal.text = str(v)
                __op.append(__literal)
                __and.append(__op)
            __filter.append(__and)

        if intersects is not None:
            __intersects = etree.Element('Intersects')
            __value_reference = etree.Element('ValueReference')
            __value_reference.text = layer.column_geom
            __intersects.append(__value_reference)
            if intersects.srid is not None:
                srs_intersects = SRS.filter_by(id=intersects.srid).one()
            else:
                srs_intersects = layer.srs
            osr_intersects = osr.SpatialReference()
            osr_intersects.ImportFromWkt(srs_intersects.wkt)
            geom = ogr.CreateGeometryFromWkb(intersects.wkb, osr_intersects)
            geom_gml = geom.ExportToGML([
                'FORMAT=GML32',
                'NAMESPACE_DECL=YES',
                'SRSNAME_FORMAT=SHORT',
                'GMLID=filter-geom-1'])
            __gml = etree.fromstring(geom_gml)
            __intersects.append(__gml)
            __filter.append(__intersects)

        if len(__filter) > 0:
            __query.append(__filter)
        # } Filter

        if propertyname is not None:
            for p in propertyname:
                __p = etree.Element('PropertyName')
                __p.text = p
                __query.append(__p)

        if get_count:
            req_root.attrib['resultType'] = 'hits'

        if limit is not None:
            req_root.attrib['count'] = str(limit)
            if offset is not None:
                req_root.attrib['startindex'] = str(offset)

        if srs is not None:
            req_root.attrib['srsName'] = 'EPSG:%d' % srs

        body = self.request_wfs('POST', xml_root=req_root)

        root = etree.parse(BytesIO(body)).getroot()

        features = []
        count = int(root.attrib['numberMatched'])

        if not get_count:
            _members = find_tags(root, 'member')

            fld_map = dict()
            for field in layer.fields:
                fld_map[field.keyname] = field.datatype

            features = []
            for _member in _members:
                _feature = _member[0]

                fields = dict()
                geom = None
                for _property in _feature:
                    key = ns_trim(_property.tag)
                    if key == layer.column_geom:
                        geom = geom_from_gml(_property[0])
                        continue

                    datatype = fld_map[key]
                    nil_attr = r'{http://www.w3.org/2001/XMLSchema-instance}nil'
                    if _property.attrib.get(nil_attr, 'false') == 'true':
                        value = None
                    elif datatype in (FIELD_TYPE.INTEGER, FIELD_TYPE.BIGINT):
                        value = int(_property.text)
                    elif datatype == FIELD_TYPE.REAL:
                        value = float(_property.text)
                    elif datatype == FIELD_TYPE.STRING:
                        if _property.text is None:
                            value = ''
                        else:
                            value = _property.text
                    elif datatype == FIELD_TYPE.DATE:
                        value = date.fromisoformat(_property.text)
                    elif datatype == FIELD_TYPE.TIME:
                        value = time.fromisoformat(_property.text)
                    elif datatype == FIELD_TYPE.DATETIME:
                        value = datetime.fromisoformat(_property.text)
                    else:
                        raise ValidationError("Unknown data type: %s" % datatype)
                    fields[key] = value

                fid = _feature.attrib['{http://www.opengis.net/gml/3.2}id']
                if add_box:
                    _box = box(*geom.bounds)
                else:
                    _box = None
                features.append(Feature(
                    layer=layer, id=fid_int(fid, layer.layer_name),
                    fields=fields, geom=geom, box=_box
                ))

        return features, count


class _path_attr(SP):

    def setter(self, srlzr, value):
        if not url_pattern.match(value):
            raise ValidationError("Path is not a valid url.")

        super().setter(srlzr, value)


class WFSConnectionSerializer(Serializer):
    identity = WFSConnection.identity
    resclass = WFSConnection

    _defaults = dict(read=ConnectionScope.read,
                     write=ConnectionScope.write)

    path = _path_attr(**_defaults)
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

            datatype = WFS_2_FIELD_TYPE.get(field['type'])
            if datatype is None:
                raise ValidationError("Unknown data type: %s" % field['type'])

            fopts = dict(display_name=field['name'])
            fopts.update(fdata.get(field['name'], dict()))
            self.fields.append(WFSLayerField(
                keyname=field['name'],
                datatype=datatype,
                column_name=field['name'],
                **fopts))

        # Check feature id readable
        features, count = self.connection.get_feature(self, limit=1)

        if self.geometry_type is None:
            example_feature = features[0]
            self.geometry_type = example_feature.geom.geom_type.upper()

    # IFeatureLayer

    @property
    def feature_query(self):

        class BoundFeatureQuery(FeatureQueryBase):
            layer = self
            srs_supported = (self.geometry_srid, )

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
            raise ValidationError("Invalid 'fields' parameter.")


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
        super().deserialize()


@implementer(
    IFeatureQuery,
    IFeatureQueryFilter,
    IFeatureQueryFilterBy,
    IFeatureQueryIntersects,
)
class FeatureQueryBase(FeatureQueryIntersectsMixin):

    def __init__(self):
        self._srs = None
        self._geom = False
        self._box = False
        self._fields = None
        self._limit = None
        self._offset = None

        self._filter = None

        self._filter_by = None

        self._intersects = None

    def fields(self, *args):
        self._fields = args

    def limit(self, limit, offset=0):
        self._limit = limit
        self._offset = offset

    def geom(self):
        self._geom = True

    def geom_format(self, geom_format):
        # Initialized with OGR only
        pass

    def srs(self, srs):
        self._srs = srs

    def box(self):
        self._box = True

    def filter(self, *args):
        self._filter = args

    def filter_by(self, **kwargs):
        self._filter_by = kwargs

    def intersects(self, geom):
        self._intersects = geom

    def __call__(self):
        params = dict()
        if self._filter_by is not None:
            if 'id' in self._filter_by:
                params['fid'] = self._filter_by.pop('id')
            if len(self._filter_by) > 0:
                if self._filter is None:
                    self._filter = list()
                for k, v in self._filter_by.items():
                    self._filter.append((k, 'eq', v))
        if self._filter is not None and len(self._filter) > 0:
            params['filter_'] = self._filter
        if self._limit is not None:
            params['limit'] = self._limit
            params['offset'] = self._offset
        if self._srs is not None:
            params['srs'] = self._srs.id
        if self._box:
            params['add_box'] = True
        if self._intersects:
            params['intersects'] = self._intersects

        if not self._geom and self._fields is not None:
            params['propertyname'] = self._fields
        elif not self._geom:
            params['propertyname'] = [f.keyname for f in self.layer.fields]
        elif self._fields is not None:
            params['propertyname'] = self._fields
            params['propertyname'].append(self.layer.column_geom)

        features, count = self.layer.connection.get_feature(
            self.layer, **params)

        class QueryFeatureSet(FeatureSet):
            layer = self.layer

            def __iter__(self):
                for feature in features:
                    yield feature

            @property
            def total_count(self):
                return count

        return QueryFeatureSet()
