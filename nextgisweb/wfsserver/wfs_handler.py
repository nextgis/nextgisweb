import re
from collections import OrderedDict
from datetime import datetime
from os import path
from tempfile import NamedTemporaryFile

from lxml import etree, html
from lxml.builder import ElementMaker
from osgeo import ogr, osr
from pyramid.request import Request
from shapely.geometry import box
from sqlalchemy import and_
from sqlalchemy.orm.exc import NoResultFound

from ..core.exception import ValidationError
from ..feature_layer import Feature, FIELD_TYPE, GEOM_TYPE
from ..layer import IBboxLayer
from ..lib.geometry import Geometry, GeometryNotValid
from ..lib.ows import parse_request, get_work_version
from ..resource import DataScope
from ..spatial_ref_sys import SRS

from .model import Layer
from .util import validate_tag


wfsfld_pattern = re.compile(r'^wfsfld_(\d+)$')

# Spec: http://docs.opengeospatial.org/is/09-025r2/09-025r2.html
v100 = '1.0.0'
v110 = '1.1.0'
v200 = '2.0.0'
v202 = '2.0.2'
VERSION_SUPPORTED = (v100, v110, v200, v202)

VERSION_DEFAULT = v202

XSD_DIR = path.join(path.dirname(
    path.abspath(__file__)), 'test/xsd/')

_nsmap = dict(
    wfs=OrderedDict((
        (v100, ('http://www.opengis.net/wfs', 'http://schemas.opengis.net/wfs/1.0.0/WFS-basic.xsd')),
        (v110, ('http://www.opengis.net/wfs', 'http://schemas.opengis.net/wfs/1.1.0/wfs.xsd')),
        (v200, ('http://www.opengis.net/wfs/2.0', 'http://schemas.opengis.net/wfs/2.0/wfs.xsd')),
    )),
    gml=OrderedDict((
        (v100, ('http://www.opengis.net/gml', 'http://schemas.opengis.net/gml/2.1.2/feature.xsd')),
        (v110, ('http://www.opengis.net/gml', 'http://schemas.opengis.net/gml/3.1.1/base/feature.xsd')),
        (v200, ('http://www.opengis.net/gml/3.2', 'http://schemas.opengis.net/gml/3.2.1/feature.xsd')),
    )),
    ogc=OrderedDict((
        (v100, ('http://www.opengis.net/ogc', None)),
    )),
    xsi=OrderedDict((
        (v100, ('http://www.w3.org/2001/XMLSchema-instance', None)),
    )),
    ows=OrderedDict((
        (v110, ('http://www.opengis.net/ows', None)),
        (v200, ('http://www.opengis.net/ows/1.1', None)),
    )),
    xlink=OrderedDict((
        (v110, ('http://www.w3.org/1999/xlink', None)),
    )),
    fes=OrderedDict((
        (v200, ('http://www.opengis.net/fes/2.0', None)),
    ))
)


def nsmap(prefix, request_version):
    item = _nsmap[prefix]
    for version, (ns, loc) in reversed(item.items()):
        if version <= request_version:
            return dict(ns=ns, loc=loc)
    raise ValidationError("Namespace %s not found for version %s." % (prefix, request_version))


def ns_attr(ns, attr, request_version):
    return '{{{0}}}{1}'.format(nsmap(ns, request_version)['ns'], attr)


def ns_trim(value):
    pos = max(value.find('}'), value.rfind(':'))
    return value[pos + 1:]


def El(tag, attrs=None, parent=None, text=None, namespace=None):
    if namespace is None:
        e = etree.Element(tag, attrs)
    else:
        EM = ElementMaker(namespace=namespace)
        e = EM(tag, attrs) if attrs is not None else EM(tag)
    if text is not None:
        e.text = text
    if parent is not None:
        parent.append(e)
    return e


def find_tags(element, tag):
    return element.xpath('.//*[local-name()="%s"]' % tag)


def fid_encode(fid, layer_name):
    return '%s.%d' % (layer_name, fid)


def fid_decode(fid, layer_name):
    int_pos = len(layer_name) + 1
    return int(fid[int_pos:])


GET_CAPABILITIES = 'GetCapabilities'
DESCRIBE_FEATURE_TYPE = 'DescribeFeatureType'
GET_FEATURE = 'GetFeature'
TRANSACTION = 'Transaction'

GEOM_TYPE_TO_GML_TYPE = {
    GEOM_TYPE.POINT: 'gml:PointPropertyType',
    GEOM_TYPE.LINESTRING: 'gml:LineStringPropertyType',
    GEOM_TYPE.POLYGON: 'gml:PolygonPropertyType',
    GEOM_TYPE.MULTIPOINT: 'gml:MultiPointPropertyType',
    GEOM_TYPE.MULTILINESTRING: 'gml:MultiLineStringPropertyType',
    GEOM_TYPE.MULTIPOLYGON: 'gml:MultiPolygonPropertyType',
    GEOM_TYPE.POINTZ: 'gml:PointPropertyType',
    GEOM_TYPE.LINESTRINGZ: 'gml:LineStringPropertyType',
    GEOM_TYPE.POLYGONZ: 'gml:PolygonPropertyType',
    GEOM_TYPE.MULTIPOINTZ: 'gml:MultiPointPropertyType',
    GEOM_TYPE.MULTILINESTRINGZ: 'gml:MultiLineStringPropertyType',
    GEOM_TYPE.MULTIPOLYGONZ: 'gml:MultiPolygonPropertyType',
}


def get_geom_column(feature_layer):
    return feature_layer.column_geom if hasattr(feature_layer, 'column_geom') else 'geom'


srs_formats = dict(
    short=dict(pattern=re.compile(r'EPSG:(\d+)'), axis_xy=True),
    ogc_urn=dict(pattern=re.compile(r'urn:ogc:def:crs:EPSG::(\d+)'), axis_xy=False),
    ogc_url=dict(pattern=re.compile(r'http://www.opengis.net/def/crs/EPSG/0/(\d+)'),
                 axis_xy=False),
)


def srs_short_format(srs_id):
    return 'EPSG:%d' % srs_id


def srs_ogc_urn_format(srs_id):
    return 'urn:ogc:def:crs:EPSG::%d' % srs_id


def parse_srs(value):
    for srs_format in srs_formats.values():
        match = srs_format['pattern'].match(value)
        if match is not None:
            return int(match[1]), srs_format['axis_xy']
    raise ValidationError("Could not recognize SRS format '%s'." % value)


def geom_from_gml(el):
    srid, axis_xy = parse_srs(el.attrib['srsName']) \
        if 'srsName' in el.attrib else (None, True)
    value = etree.tostring(el).decode()
    ogr_geom = ogr.CreateGeometryFromGML(value)
    geom = Geometry.from_ogr(ogr_geom, srid=srid)
    if not axis_xy:
        srs = SRS.filter_by(id=srid).one()
        if srs.is_geographic:
            return geom.flip_coordinates()
    return geom


class WFSHandler():
    def __init__(self, resource, request, force_schema_validation=False):
        self.resource = resource
        self.request = request

        if self.request.method not in ('GET', 'POST'):
            raise ValidationError("Unsupported request method")

        params, self.root_body = parse_request(request)

        self.p_request = params.get('REQUEST')

        self.p_version = get_work_version(params.get('VERSION'), params.get('ACCEPTVERSIONS'), VERSION_SUPPORTED, VERSION_DEFAULT)
        if self.p_version not in VERSION_SUPPORTED:
            raise ValidationError("Unsupported version")

        self.p_typenames = params.get('TYPENAMES', params.get('TYPENAME'))
        self.p_resulttype = params.get('RESULTTYPE')
        self.p_bbox = params.get('BBOX')
        self.p_srsname = params.get('SRSNAME')
        self.p_count = params.get('COUNT', params.get('MAXFEATURES'))
        self.p_startindex = params.get('STARTINDEX')

        self.p_validate_schema = force_schema_validation or (
            params.get('VALIDATESCHEMA', 'FALSE').upper() in ('1', 'YES', 'TRUE'))

        self.service_namespace = self.request.route_url(
            'wfsserver.wfs', id=self.resource.id)

    @staticmethod
    def exception_response(request, err_title, err_message):
        if err_title is not None and err_message is not None:
            message = '%s: %s' % (err_title, err_message)
        elif err_message is not None:
            message = err_message
        else:
            message = "Unknown error"

        params, root_body = parse_request(request)
        version = get_work_version(params.get('VERSION'), params.get('ACCEPTVERSIONS'),
                                   VERSION_SUPPORTED, VERSION_DEFAULT)
        if version is None:
            version = VERSION_DEFAULT

        if version >= v200:
            root = El('ExceptionReport', dict(
                version=version,
                xmlns=nsmap('ows', version)['ns']))
            _exc = El('Exception', parent=root)
            El('ExceptionText', parent=_exc, text=message)
        else:
            root = El('ServiceExceptionReport', dict(
                version='1.2.0',
                xmlns=nsmap('ogc', version)['ns']))
            El('ServiceException', parent=root, text=message)

        return etree.tostring(root, encoding='utf-8')

    @property
    def title(self):
        return self.resource.display_name

    @property
    def abstract(self):
        return html.document_fromstring(self.resource.description).text_content() \
            if self.resource.description is not None else ''

    @property
    def gml_format(self):
        return 'GML32' if self.p_version >= v200 else 'GML2'

    def response(self):
        if self.p_request == GET_CAPABILITIES:
            if self.p_version >= v200:
                root = self._get_capabilities200()
            elif self.p_version == v110:
                root = self._get_capabilities110()
            else:
                root = self._get_capabilities100()
        elif self.p_request == DESCRIBE_FEATURE_TYPE:
            root = self._describe_feature_type()
        elif self.p_request == GET_FEATURE:
            root = self._get_feature()
        elif self.p_request == TRANSACTION:
            root = self._transaction()
        else:
            raise ValidationError("Unsupported request: '%s'." % self.p_request)

        xml = etree.tostring(root, encoding='unicode')

        if self.p_validate_schema:
            if self.p_request in (GET_CAPABILITIES, TRANSACTION):
                if self.p_version == v100:
                    version_dir = '1.0.0'
                elif self.p_version == v110:
                    version_dir = '1.1.0'
                else:
                    version_dir = '2.0'
                wfs_schema_dir = path.join(XSD_DIR, 'schemas.opengis.net/wfs/')
                xsd_file = 'WFS-capabilities.xsd' if self.p_version == v100 \
                    and self.p_request == GET_CAPABILITIES else 'wfs.xsd'
                xsd_path = path.join(wfs_schema_dir, version_dir, xsd_file)

                schema = etree.XMLSchema(file=xsd_path)
                schema.assertValid(etree.XML(xml))
            elif self.p_request == DESCRIBE_FEATURE_TYPE:
                xsd_path = path.join(XSD_DIR, 'www.w3.org/2009/XMLSchema/XMLSchema.xsd')

                schema = etree.XMLSchema(file=xsd_path)
                schema.assertValid(etree.XML(xml))
            elif self.p_request == GET_FEATURE:
                describe_path = self.request.route_path(
                    'wfsserver.wfs', id=self.resource.id, _query=dict(
                        REQUEST=DESCRIBE_FEATURE_TYPE, SERVICE='WFS',
                        VERSION=self.p_version, TYPENAME=self.p_typenames))
                subreq = Request.blank(describe_path)
                subreq.headers = self.request.headers
                resp = self.request.invoke_subrequest(subreq)
                describe_root = etree.XML(resp.body)

                opengis_url = 'http://schemas.opengis.net'
                opengis_dir = path.join(XSD_DIR, 'schemas.opengis.net')
                for el in describe_root.xpath('.//*[starts-with(@schemaLocation, \'%s\')]' % opengis_url):
                    el.attrib['schemaLocation'] = el.attrib['schemaLocation'].replace(opengis_url, opengis_dir)

                with NamedTemporaryFile() as tmp:
                    tmp.write(etree.tostring(describe_root))
                    tmp.flush()

                    _schema = El('schema', dict(elementFormDefault='qualified'), namespace='http://www.w3.org/2001/XMLSchema')
                    El('import', dict(namespace=self.service_namespace, schemaLocation=tmp.name), parent=_schema, namespace='http://www.w3.org/2001/XMLSchema')

                    schema = etree.XMLSchema(etree=_schema)
                    schema.assertValid(etree.XML(xml))
            else:
                raise ValidationError("Schema validation isn't supported for {} request".format(self.p_request))

        return xml

    def _feature_type_list(self, parent):
        __list = El('FeatureTypeList', parent=parent)
        if self.p_version < v200:
            __ops = El('Operations', parent=__list)
            if self.p_version == v110:
                El('Operation', text='Query', parent=__ops)
            else:
                El('Query', parent=__ops)

        EM_name = ElementMaker(nsmap=dict(ngw=self.service_namespace))
        for layer in self.resource.layers:
            feature_layer = layer.resource
            if not feature_layer.has_permission(DataScope.read, self.request.user):
                continue
            __type = El('FeatureType', parent=__list)
            __name = EM_name('Name')
            __name.text = layer.keyname
            __type.append(__name)
            El('Title', parent=__type, text=layer.display_name)
            El('Abstract', parent=__type)

            if self.p_version >= v200:
                srs_tag = 'DefaultCRS'
            elif self.p_version == v110:
                srs_tag = 'DefaultSRS'
            else:
                srs_tag = 'SRS'
            El(srs_tag, parent=__type, text=srs_short_format(layer.resource.srs_id))

            if self.p_version >= v110:
                for srs in SRS.filter(and_(
                    SRS.auth_name == 'EPSG',
                    SRS.id != layer.resource.srs_id
                )).all():
                    other_srs_tag = 'OtherCRS' if self.p_version >= v200 else 'OtherSRS'
                    El(other_srs_tag, parent=__type, text=srs_short_format(srs.id))

            if self.p_version == v100:
                __ops = El('Operations', parent=__type)
                if feature_layer.has_permission(DataScope.write, self.request.user):
                    El('Insert', parent=__ops)
                    El('Update', parent=__ops)
                    El('Delete', parent=__ops)

            if IBboxLayer.providedBy(feature_layer):
                extent = feature_layer.extent
                if None not in extent.values():
                    if self.p_version >= v110:
                        _ns_ows = nsmap('ows', self.p_version)['ns']
                        __bbox = El('WGS84BoundingBox', namespace=_ns_ows, parent=__type)
                        El('LowerCorner', namespace=_ns_ows, parent=__bbox,
                           text='%.6f %.6f' % (extent['minLon'], extent['minLat']))
                        El('UpperCorner', namespace=_ns_ows, parent=__bbox,
                           text='%.6f %.6f' % (extent['maxLon'], extent['maxLat']))
                    else:
                        bbox = dict(maxx=str(extent['maxLon']), maxy=str(extent['maxLat']),
                                    minx=str(extent['minLon']), miny=str(extent['minLat']))
                        El('LatLongBoundingBox', bbox, parent=__type)

    def _parse_filter(self, __filter, layer):
        fids = list()
        intersects = None
        for __el in __filter:
            tag = ns_trim(__el.tag)
            if tag == 'Intersects':
                __value_reference = __el[0]
                if ns_trim(__value_reference.tag) != 'ValueReference':
                    raise ValidationError("Intersects parse: ValueReference required.")
                elif __value_reference.text != get_geom_column(layer.resource):
                    raise ValidationError("Geometry column '%s' not found" % __value_reference.text)
                __gml = __el[1]
                try:
                    intersects = geom_from_gml(__gml)
                except GeometryNotValid:
                    raise ValidationError("Intersects parse: geometry is not valid.")
                continue

            if tag == 'ResourceId':  # 2.0.0
                resid_attr = 'rid'
            elif tag == 'GmlObjectId':  # 1.1.0
                resid_attr = ns_attr('gml', 'id', self.p_version)
            elif tag == 'FeatureId':  # 1.0.0 and 1.1.0
                resid_attr = 'fid'
            else:
                raise ValidationError("Filter element '%s' not supported." % __el.tag)
            fid = __el.get(resid_attr)
            fids.append(fid_decode(fid, layer.keyname))
        return fids, intersects

    def _get_capabilities100(self):
        EM = ElementMaker(nsmap=dict(ogc=nsmap('ogc', self.p_version)['ns']))
        root = EM('WFS_Capabilities', dict(
            version=self.p_version,
            xmlns=nsmap('wfs', self.p_version)['ns']))

        wfs_url = self.request.route_url('wfsserver.wfs', id=self.resource.id)

        # Service
        __s = El('Service', parent=root)
        El('Name', parent=__s, text=self.resource.keyname or 'WFS')
        El('Title', parent=__s, text=self.title)
        El('Abstract', parent=__s, text=self.abstract)
        El('OnlineResource', text=wfs_url, parent=__s)

        # Operations
        __c = El('Capability', parent=root)
        __r = El('Request', parent=__c)

        for wfs_operation in (
            GET_CAPABILITIES,
            DESCRIBE_FEATURE_TYPE,
            GET_FEATURE,
            TRANSACTION,
        ):
            __wfs_op = El(wfs_operation, parent=__r)
            if wfs_operation == DESCRIBE_FEATURE_TYPE:
                __lang = El('SchemaDescriptionLanguage', parent=__wfs_op)
                El('XMLSCHEMA', parent=__lang)
            if wfs_operation == GET_FEATURE:
                __format = El('ResultFormat', parent=__wfs_op)
                El(self.gml_format, parent=__format)

            __dcp = El('DCPType', parent=__wfs_op)
            __http = El('HTTP', parent=__dcp)
            for request_method in ('Get', 'Post'):
                if wfs_operation == TRANSACTION and request_method != 'Post':
                    continue
                El(request_method, dict(onlineResource=wfs_url), parent=__http)

        # FeatureTypeList
        self._feature_type_list(root)

        # Filter_Capabilities
        _ns_ogc = nsmap('ogc', self.p_version)['ns']
        __filter = El('Filter_Capabilities', namespace=_ns_ogc, parent=root)

        __sc = El('Spatial_Capabilities', namespace=_ns_ogc, parent=__filter)
        __so = El('Spatial_Operators', namespace=_ns_ogc, parent=__sc)
        El('BBOX', namespace=_ns_ogc, parent=__so)

        __sc = El('Scalar_Capabilities', namespace=_ns_ogc, parent=__filter)
        El('Logical_Operators', namespace=_ns_ogc, parent=__sc)

        return root

    def _get_capabilities110(self):
        _ns_ows = nsmap('ows', self.p_version)['ns']
        _ns_ogc = nsmap('ogc', self.p_version)['ns']

        EM = ElementMaker(nsmap=dict(
            ows=_ns_ows, xlink=nsmap('xlink', self.p_version)['ns'], gml=nsmap('gml', self.p_version)['ns']
        ))
        root = EM('WFS_Capabilities', dict(
            version=self.p_version,
            xmlns=nsmap('wfs', self.p_version)['ns']))

        # Service
        __service = El('ServiceIdentification', namespace=_ns_ows, parent=root)
        El('Title', namespace=_ns_ows, parent=__service, text=self.title)
        El('Abstract', namespace=_ns_ows, parent=__service, text=self.abstract)
        El('ServiceType', namespace=_ns_ows, parent=__service, text='WFS')
        for version in VERSION_SUPPORTED:
            El('ServiceTypeVersion', namespace=_ns_ows, parent=__service, text=version)

        # Operations
        __op_md = El('OperationsMetadata', namespace=_ns_ows, parent=root)

        wfs_url = self.request.route_url('wfsserver.wfs', id=self.resource.id)
        for wfs_operation in (
            GET_CAPABILITIES,
            DESCRIBE_FEATURE_TYPE,
            GET_FEATURE,
            TRANSACTION,
        ):
            __wfs_op = El('Operation', dict(name=wfs_operation), namespace=_ns_ows, parent=__op_md)
            req_methods = ('Get', 'Post') if wfs_operation != TRANSACTION else ('Post', )
            __dcp = El('DCP', namespace=_ns_ows, parent=__wfs_op)
            __http = El('HTTP', namespace=_ns_ows, parent=__dcp)
            for req_mehtod in req_methods:
                El(req_mehtod, {
                    ns_attr('xlink', 'href', self.p_version):
                    wfs_url + '?' if req_mehtod == 'Get' else wfs_url
                }, namespace=_ns_ows, parent=__http)

        __parameter = El('Parameter', dict(name='AcceptVersions'), namespace=_ns_ows, parent=__op_md)
        for version in VERSION_SUPPORTED:
            El('Value', text=version, namespace=_ns_ows, parent=__parameter)

        # FeatureTypeList
        self._feature_type_list(root)

        # Filter_Capabilities
        __filter = El('Filter_Capabilities', namespace=_ns_ogc, parent=root)

        __sc = El('Spatial_Capabilities', namespace=_ns_ogc, parent=__filter)

        __go = El('GeometryOperands', namespace=_ns_ogc, parent=__sc)
        for operand in (
            'gml:Envelope',
            'gml:Point',
            'gml:LineString',
            'gml:Polygon'
        ):
            El('GeometryOperand', text=operand, namespace=_ns_ogc, parent=__go)

        __so = El('SpatialOperators', namespace=_ns_ogc, parent=__sc)
        El('SpatialOperator', dict(name='BBOX'), namespace=_ns_ogc, parent=__so)

        __sc = El('Scalar_Capabilities', namespace=_ns_ogc, parent=__filter)
        El('LogicalOperators', namespace=_ns_ogc, parent=__sc)

        __id = El('Id_Capabilities', namespace=_ns_ogc, parent=__filter)
        El('FID', namespace=_ns_ogc, parent=__id)

        return root

    def _get_capabilities200(self):
        _ns_ows = nsmap('ows', self.p_version)['ns']
        _ns_fes = nsmap('fes', self.p_version)['ns']

        EM = ElementMaker(nsmap=dict(
            fes=_ns_fes, ows=_ns_ows, xlink=nsmap('xlink', self.p_version)['ns']
        ))
        root = EM('WFS_Capabilities', dict(
            version=self.p_version,
            xmlns=nsmap('wfs', self.p_version)['ns']))

        # Service
        __service = El('ServiceIdentification', namespace=_ns_ows, parent=root)
        El('Title', namespace=_ns_ows, parent=__service, text=self.title)
        El('Abstract', namespace=_ns_ows, parent=__service, text=self.abstract)
        El('ServiceType', namespace=_ns_ows, parent=__service, text='WFS')
        for version in VERSION_SUPPORTED:
            El('ServiceTypeVersion', namespace=_ns_ows, parent=__service, text=version)

        # Operations
        __op_md = El('OperationsMetadata', namespace=_ns_ows, parent=root)

        wfs_url = self.request.route_url('wfsserver.wfs', id=self.resource.id) + '?'
        for wfs_operation in (
            GET_CAPABILITIES,
            DESCRIBE_FEATURE_TYPE,
            GET_FEATURE,
            TRANSACTION,
        ):
            __wfs_op = El('Operation', dict(name=wfs_operation), namespace=_ns_ows, parent=__op_md)
            req_methods = ('Get', 'Post') if wfs_operation != TRANSACTION else ('Post', )
            __dcp = El('DCP', namespace=_ns_ows, parent=__wfs_op)
            __http = El('HTTP', namespace=_ns_ows, parent=__dcp)
            for req_mehtod in req_methods:
                El(req_mehtod, {ns_attr('xlink', 'href', self.p_version): wfs_url},
                   namespace=_ns_ows, parent=__http)

        __parameter = El('Parameter', dict(name='version'), namespace=_ns_ows, parent=__op_md)
        __values = El('AllowedValues', namespace=_ns_ows, parent=__parameter)
        for version in VERSION_SUPPORTED:
            El('Value', text=version, namespace=_ns_ows, parent=__values)

        # FeatureTypeList
        self._feature_type_list(root)

        # Filter_Capabilities
        __filter = El('Filter_Capabilities', namespace=_ns_fes, parent=root)
        __conf = El('Conformance', namespace=_ns_fes, parent=__filter)

        def constraint(name, default):
            __constraint = El('Constraint', dict(name=name),
                              namespace=_ns_fes, parent=__conf)
            El('NoValues', namespace=_ns_ows, parent=__constraint)
            El('DefaultValue', namespace=_ns_ows, parent=__constraint, text=default)

        constraint('ImplementsTransactionalWFS', 'TRUE')
        constraint('ImplementsQuery', 'FALSE')
        constraint('ImplementsAdHocQuery', 'FALSE')
        constraint('ImplementsFunctions', 'FALSE')
        constraint('ImplementsMinStandardFilter', 'FALSE')
        constraint('ImplementsStandardFilter', 'FALSE')
        constraint('ImplementsMinSpatialFilter', 'FALSE')
        constraint('ImplementsSpatialFilter', 'FALSE')
        constraint('ImplementsMinTemporalFilter', 'FALSE')
        constraint('ImplementsTemporalFilter', 'FALSE')
        constraint('ImplementsVersionNav', 'FALSE')
        constraint('ImplementsSorting', 'FALSE')
        constraint('ImplementsExtendedOperators', 'FALSE')

        return root

    def _field_key_encode(self, field):
        k = field.keyname
        if validate_tag(k) and not wfsfld_pattern.match(k):
            return k
        return 'wfsfld_%d' % field.id

    def _field_key_decode(self, value, fields):
        match = wfsfld_pattern.match(value)
        if match is not None:
            fld_id = int(match[1])
            for field in fields:
                if field.id == fld_id:
                    return field.keyname
            raise ValidationError("Field (id=%d) not found." % fld_id)
        return value

    def _describe_feature_type(self):
        gml = nsmap('gml', self.p_version)
        wfs = nsmap('wfs', self.p_version)

        EM = ElementMaker(nsmap=dict(gml=gml['ns'], ngw=self.service_namespace))
        root = EM('schema', dict(
            targetNamespace=self.service_namespace,
            elementFormDefault='qualified',
            attributeFormDefault='unqualified',
            version='0.1',
            xmlns='http://www.w3.org/2001/XMLSchema'))

        El('import', dict(
            namespace=gml['ns'],
            schemaLocation=gml['loc']
        ), parent=root)
        El('import', dict(
            namespace=wfs['ns'],
            schemaLocation=wfs['loc']
        ), parent=root)

        if self.request.method == 'GET':
            typenames = None if self.p_typenames is None \
                else self.p_typenames.split(',')
        elif self.request.method == 'POST':
            __typenames = find_tags(self.root_body, 'TypeName')
            typenames = None if len(__typenames) == 0 \
                else [__typename.text for __typename in __typenames]

        if typenames is None:
            typenames = [layer.keyname for layer in self.resource.layers]
        else:
            typenames = [ns_trim(tn) for tn in typenames]

        for typename in typenames:
            substitutionGroup = 'gml:AbstractFeature' if self.p_version >= v200 else 'gml:_Feature'
            El('element', dict(name=typename, substitutionGroup=substitutionGroup,
                               type='ngw:%s_Type' % typename), parent=root)

        for typename in typenames:
            try:
                layer = Layer.filter_by(service_id=self.resource.id, keyname=typename).one()
            except NoResultFound:
                raise ValidationError("Unknown layer: %s." % typename)
            feature_layer = layer.resource
            __ctype = El('complexType', dict(name="%s_Type" % typename), parent=root)
            __ccontent = El('complexContent', parent=__ctype)
            __ext = El('extension', dict(base='gml:AbstractFeatureType'), parent=__ccontent)
            __seq = El('sequence', parent=__ext)

            if feature_layer.geometry_type not in GEOM_TYPE_TO_GML_TYPE:
                raise ValidationError("Geometry type not supported: %s"
                                      % feature_layer.geometry_type)
            El('element', dict(minOccurs='0', name='geom', type=GEOM_TYPE_TO_GML_TYPE[
                feature_layer.geometry_type]), parent=__seq)

            for field in feature_layer.fields:
                if field.datatype == FIELD_TYPE.REAL:
                    datatype = 'double'
                elif field.datatype == FIELD_TYPE.DATETIME:
                    datatype = 'dateTime'
                else:
                    datatype = field.datatype.lower()
                El('element', dict(minOccurs='0', name=self._field_key_encode(field),
                                   type=datatype, nillable='true'), parent=__seq)

        return root

    def _get_feature(self):
        wfs = nsmap('wfs', self.p_version)
        gml = nsmap('gml', self.p_version)

        __query = None

        if self.request.method == 'POST':
            __queries = find_tags(self.root_body, 'Query')
            if len(__queries) > 1:
                raise ValidationError("Multiple queries not supported.")
            __query = __queries[0]
            for k, v in __query.attrib.items():
                if k.upper() in ('TYPENAME', 'TYPENAMES'):
                    self.p_typenames = v
                    break

        if self.p_typenames is None:
            raise ValidationError("Parameter TYPENAMES must be specified.")
        else:
            self.p_typenames = ns_trim(self.p_typenames)

        try:
            layer = Layer.filter_by(service_id=self.resource.id, keyname=self.p_typenames).one()
        except NoResultFound:
            raise ValidationError("Unknown layer: %s." % self.p_typenames)
        feature_layer = layer.resource
        self.request.resource_permission(DataScope.read, feature_layer)

        EM = ElementMaker(namespace=wfs['ns'], nsmap=dict(
            gml=gml['ns'], wfs=wfs['ns'], ngw=self.service_namespace,
            ogc=nsmap('ogc', self.p_version)['ns'], xsi=nsmap('xsi', self.p_version)['ns']
        ))
        describe_location = self.request.route_url(
            'wfsserver.wfs', id=self.resource.id,
            _query=dict(REQUEST=DESCRIBE_FEATURE_TYPE, SERVICE='WFS',
                        VERSION=self.p_version, TYPENAME=self.p_typenames))
        schema_location = ' '.join((
            wfs['ns'], wfs['loc'],
            gml['ns'], gml['loc'],
            self.service_namespace, describe_location
        ))
        root = EM('FeatureCollection', {
            'xmlns': self.service_namespace,
            ns_attr('xsi', 'schemaLocation', self.p_version): schema_location
        })

        query = feature_layer.feature_query()

        if self.p_bbox is not None:
            bbox_param = self.p_bbox.split(',')
            box_coords = map(float, bbox_param[:4])
            box_srid, box_axis_xy = parse_srs(bbox_param[4]) \
                if len(bbox_param) == 5 else (feature_layer.srs_id, True)
            try:
                box_geom = Geometry.from_shape(box(*box_coords), srid=box_srid, validate=True)
                # if not box_axis_xy and SRS.filter_by(id=box_srid).one().is_geographic:
                #   It seems that QGIS is always passes lat/lon BBOX for geographical SRS
                #   TODO: handle QGIS fix versions
                if SRS.filter_by(id=box_srid).one().is_geographic:
                    box_geom = box_geom.flip_coordinates()
            except GeometryNotValid:
                raise ValidationError("Paremeter BBOX geometry is not valid.")
            query.intersects(box_geom)

        if __query is not None:
            __filters = find_tags(__query, 'Filter')
            if len(__filters) == 1:
                fids, intersects = self._parse_filter(__filters[0], layer)
                if len(fids) > 0:
                    query.filter(('id', 'in', ','.join((str(fid) for fid in fids))))
                if intersects is not None:
                    if self.p_bbox is not None:
                        raise ValidationError("Parameters conflict: BBOX, Intersects")
                    query.intersects(intersects)
            elif len(__filters) > 1:
                raise ValidationError("Multiple filters not supported.")

        limit = int(self.p_count) if self.p_count is not None else layer.maxfeatures
        if limit is not None:
            offset = 0 if self.p_startindex is None else int(self.p_startindex)
            query.limit(limit, offset)

        count = 0

        if self.p_resulttype == 'hits':
            matched = query().total_count
        else:
            query.geom()

            if self.p_srsname is not None:
                # Ignore axis_xy, return X/Y always
                srs_id, axis_xy = parse_srs(self.p_srsname)
                srs_out = feature_layer.srs \
                    if srs_id == feature_layer.srs_id \
                    else SRS.filter_by(id=srs_id).one()
            else:
                srs_out = feature_layer.srs
            query.srs(srs_out)

            osr_out = osr.SpatialReference()
            osr_out.ImportFromWkt(srs_out.wkt)

            __boundedBy = El('boundedBy', parent=root,
                namespace=wfs['ns'] if self.p_version >= v200 else gml['ns'])
            minX = maxX = minY = maxY = None

            for feature in query():
                feature_id = fid_encode(feature.id, layer.keyname)
                __member = El('member', parent=root, namespace=wfs['ns']) if self.p_version >= v200 \
                    else El('featureMember', parent=root, namespace=gml['ns'])
                id_attr = ns_attr('gml', 'id', self.p_version) if self.p_version >= v110 else 'fid'
                __feature = El(layer.keyname, {id_attr: feature_id}, parent=__member)

                geom = ogr.CreateGeometryFromWkb(feature.geom.wkb, osr_out)

                _minX, _maxX, _minY, _maxY = geom.GetEnvelope()
                minX = _minX if minX is None else min(minX, _minX)
                minY = _minY if minY is None else min(minY, _minY)
                maxX = _maxX if maxX is None else max(maxX, _maxX)
                maxY = _maxY if maxY is None else max(maxY, _maxY)

                geom_gml = geom.ExportToGML([
                    'FORMAT=%s' % self.gml_format,
                    'NAMESPACE_DECL=YES',
                    'SRSNAME_FORMAT=SHORT',
                    'GMLID=geom-%s' % feature_id])
                __geom = El('geom', parent=__feature)
                __gml = etree.fromstring(geom_gml)
                __geom.append(__gml)

                for field in feature_layer.fields:
                    _field = El(self._field_key_encode(field), parent=__feature)
                    value = feature.fields[field.keyname]
                    if value is not None:
                        if isinstance(value, datetime):
                            value = value.isoformat()
                        elif not isinstance(value, str):
                            value = str(value)
                        _field.text = value
                    else:
                        _field.set(ns_attr('xsi', 'nil', self.p_version), 'true')

                count += 1

            if None in (minX, minY, maxX, maxY):
                El('Null' if self.gml_format == 'GML32' else 'null', parent=__boundedBy, namespace=gml['ns'], text='unknown')
            elif self.p_version >= v110:
                _envelope = El('Envelope', dict(srsName=srs_short_format(srs_out.id)), parent=__boundedBy, namespace=gml['ns'])
                El('lowerCorner', parent=_envelope, namespace=gml['ns'], text='%f %f' % (minX, minY))
                El('upperCorner', parent=_envelope, namespace=gml['ns'], text='%f %f' % (maxX, maxY))
            else:
                _box = El('Box', dict(srsName=srs_short_format(srs_out.id)), parent=__boundedBy, namespace=gml['ns'])
                El('coordinates', parent=_box, namespace=gml['ns'], text='%f %f %f %f' % (minX, minY, maxX, maxY))

            matched = count

        if self.p_version == v110:
            root.set('numberOfFeatures', str(count))
        elif self.p_version >= v200:
            root.set('numberMatched', str(matched))
            root.set('numberReturned', str(count))

        if self.p_version >= v110:
            root.set('timeStamp', datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%S.%f"))

        return root

    def _transaction(self):
        _ns_wfs = nsmap('wfs', self.p_version)['ns']
        _ns_ogc = nsmap('ogc', self.p_version)['ns']
        if self.p_version >= v200:
            _ns_fes = nsmap('fes', self.p_version)['ns']

        layers = dict()

        def find_layer(keyname):
            if keyname not in layers:
                try:
                    layer = Layer.filter_by(service_id=self.resource.id, keyname=keyname).one()
                except NoResultFound:
                    raise ValidationError("Unknown layer: %s." % keyname)
                self.request.resource_permission(DataScope.write, layer.resource)
                layers[keyname] = layer
            return layers[keyname]

        EM = ElementMaker(namespace=_ns_wfs, nsmap=dict(
            wfs=_ns_wfs, ogc=_ns_ogc, xsi=nsmap('xsi', self.p_version)['ns']))
        _response = EM('WFS_TransactionResponse' if self.p_version == v100
                       else 'TransactionResponse', dict(version=self.p_version))

        show_summary = self.p_version >= v110

        if show_summary:
            _summary = El('TransactionSummary', namespace=_ns_wfs, parent=_response)
            summary = dict(totalInserted=0, totalUpdated=0, totalDeleted=0)

        for _operation in self.root_body:
            operation_tag = ns_trim(_operation.tag)
            if operation_tag == 'Insert':
                _layer = _operation[0]
                keyname = ns_trim(_layer.tag)
                layer = find_layer(keyname)
                feature_layer = layer.resource

                feature = Feature()

                geom_column = get_geom_column(feature_layer)

                for _property in _layer:
                    key = ns_trim(_property.tag)
                    fld_keyname = self._field_key_decode(key, feature_layer.fields)
                    if fld_keyname == geom_column:
                        try:
                            geom = geom_from_gml(_property[0])
                        except GeometryNotValid:
                            raise ValidationError("Geometry is not valid.")
                        if geom.srid is not None and geom.srid != feature_layer.srs_id:
                            raise ValidationError("Input geometry projection is not supported.")
                        feature.geom = geom
                    else:
                        feature.fields[fld_keyname] = _property.text

                fid = feature_layer.feature_create(feature)
                fid_str = fid_encode(fid, keyname)

                _insert = El('InsertResult' if self.p_version == v100 else 'InsertResults',
                             namespace=_ns_wfs, parent=_response)
                if self.p_version >= v200:
                    _feature = El('Feature', namespace=_ns_wfs, parent=_insert)
                    El('ResourceId', dict(rid=fid_str), namespace=_ns_fes, parent=_feature)
                elif self.p_version == v110:
                    _feature = El('Feature', namespace=_ns_wfs, parent=_insert)
                    El('FeatureId', dict(fid=fid_str), namespace=_ns_ogc, parent=_feature)
                else:
                    El('FeatureId', dict(fid=fid_str), namespace=_ns_ogc, parent=_insert)

                if show_summary:
                    summary['totalInserted'] += 1
            else:
                keyname = ns_trim(_operation.get('typeName'))
                layer = find_layer(keyname)
                feature_layer = layer.resource

                _filter = find_tags(_operation, 'Filter')[0]
                fids, intersects = self._parse_filter(_filter, layer)
                if intersects is not None:
                    raise ValidationError("Intersects filter not supported in transaction")
                if len(fids) == 0:
                    raise ValidationError("Feature ID filter must be specified.")

                if operation_tag == 'Update':
                    query = feature_layer.feature_query()

                    if len(fids) != 1:
                        raise ValidationError("Multiple features not supported in update transaction")
                    # query.filter(('id', 'in', ','.join((str(fid) for fid in fids))))
                    query.filter_by(id=fids[0])

                    feature = query().one()

                    geom_column = get_geom_column(feature_layer)

                    for _property in find_tags(_operation, 'Property'):
                        key = find_tags(_property, 'Name')[0].text
                        fld_keyname = self._field_key_decode(key, feature_layer.fields)
                        _values = find_tags(_property, 'Value')
                        _value = None if len(_values) == 0 else _values[0]

                        if fld_keyname == geom_column:
                            try:
                                geom = geom_from_gml(_value[0])
                            except GeometryNotValid:
                                raise ValidationError("Geometry is not valid.")
                            if geom.srid is not None and geom.srid != feature_layer.srs_id:
                                raise ValidationError("Input geometry projection is not supported.")
                            feature.geom = geom
                        else:
                            if _value is None:
                                value = None
                            elif _value.text is None:
                                value = ''
                            else:
                                value = _value.text
                            feature.fields[fld_keyname] = value

                    feature_layer.feature_put(feature)

                    if show_summary:
                        summary['totalUpdated'] += 1
                elif operation_tag == 'Delete':
                    for fid in fids:
                        feature_layer.feature_delete(fid)
                    if show_summary:
                        summary['totalDeleted'] += 1
                else:
                    raise ValidationError("Unknown operation: %s" % operation_tag)

        if show_summary:
            for param, value in summary.items():
                if value > 0:
                    El(param, namespace=_ns_wfs, text=str(value), parent=_summary)

        if self.p_version == v100:
            _result = El('TransactionResult', namespace=_ns_wfs, parent=_response)
            _status = El('Status', namespace=_ns_wfs, parent=_result)
            El('SUCCESS', namespace=_ns_wfs, parent=_status)

        return _response
