# -*- coding: utf-8 -*-
from __future__ import division, absolute_import, print_function, unicode_literals

from collections import OrderedDict
from datetime import datetime
from lxml import etree
from lxml.builder import ElementMaker

from osgeo import ogr, osr
from six import BytesIO, text_type

from ..core.exception import ValidationError
from ..feature_layer import Feature, FIELD_TYPE, GEOM_TYPE
from ..geometry import box, geom_from_wkb
from ..resource import DataScope
from ..spatial_ref_sys import SRS

from .model import Layer

# Spec: http://docs.opengeospatial.org/is/09-025r2/09-025r2.html
v100 = '1.0.0'
v110 = '1.1.0'
v200 = '2.0.0'
v202 = '2.0.2'
VERSION_SUPPORTED = (v100, v200, v202)

VERSION_DEFAULT = v202


_nsmap = dict(
    wfs=OrderedDict((
        (v100, 'http://www.opengis.net/wfs'),
        (v200, 'http://www.opengis.net/wfs/2.0'),
    )),
    gml=OrderedDict((
        (v100, 'http://www.opengis.net/gml'),
        (v200, 'http://www.opengis.net/gml/3.2'),
    )),
    ogc=OrderedDict((
        (v100, 'http://www.opengis.net/ogc'),
    )),
    xsi=OrderedDict((
        (v100, 'http://www.w3.org/2001/XMLSchema-instance'),
    ))
)


def nsmap(prefix, request_version):
    item = _nsmap[prefix]
    for version, value in reversed(item.items()):
        if version <= request_version:
            return value
    return None


def ns_attr(ns, attr, request_version):
    return '{{{0}}}{1}'.format(nsmap(ns, request_version), attr)


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


GET_CAPABILITIES = 'GetCapabilities'
DESCRIBE_FEATURE_TYPE = 'DescribeFeatureType'
GET_FEATURE = 'GetFeature'
TRANSACTION = 'Transaction'
WFS_OPERATIONS = (
    GET_CAPABILITIES,
    DESCRIBE_FEATURE_TYPE,
    GET_FEATURE,
    TRANSACTION,
)


GEOM_TYPE_TO_GML_TYPE = {
    GEOM_TYPE.POINT: 'gml:PointPropertyType',
    GEOM_TYPE.LINESTRING: 'gml:LineStringPropertyType',
    GEOM_TYPE.POLYGON: 'gml:PolygonPropertyType',
    GEOM_TYPE.MULTIPOINT: 'gml:MultiPointPropertyType',
    GEOM_TYPE.MULTILINESTRING: 'gml:MultiLineStringPropertyType',
    GEOM_TYPE.MULTIPOLYGON: 'gml:MultiPolygonPropertyType',
    GEOM_TYPE.POINTZ: 'gml:PointZPropertyType',
    GEOM_TYPE.LINESTRINGZ: 'gml:LineStringZPropertyType',
    GEOM_TYPE.POLYGONZ: 'gml:PolygonZPropertyType',
    GEOM_TYPE.MULTIPOINTZ: 'gml:MultiPointZPropertyType',
    GEOM_TYPE.MULTILINESTRINGZ: 'gml:MultiLineStringZPropertyType',
    GEOM_TYPE.MULTIPOLYGONZ: 'gml:MultiPolygonZPropertyType',
}


def get_geom_column(feature_layer):
    return feature_layer.column_geom if hasattr(feature_layer, 'column_geom') else 'geom'


def geom_from_gml(el):
    value = etree.tostring(el)
    ogr_geom = ogr.CreateGeometryFromGML(value)
    return geom_from_wkb(ogr_geom.ExportToWkb())


class WFSHandler():
    def __init__(self, resource, request):
        self.resource = resource
        self.request = request

        if self.request.method == 'GET':
            params = request.params
        elif self.request.method == 'POST':
            self.root_body = etree.parse(BytesIO(self.request.body)).getroot()
            params = self.root_body.attrib
        else:
            raise ValidationError("Unsupported request method")

        # 6.2.5.2 Parameter names shall not be case sensitive
        params = dict((k.upper(), v) for k, v in params.items())

        self.p_requset = params.get('REQUEST') if self.request.method == 'GET' \
            else ns_trim(self.root_body.tag)

        av = params.get('ACCEPTVERSIONS')
        self.p_acceptversions = None if av is None else sorted(av.split(','), reverse=True)

        self.p_version = params.get('VERSION')
        if self.p_version is None:
            if self.p_acceptversions is not None:
                for version in self.p_acceptversions:
                    if version in VERSION_SUPPORTED:
                        self.p_version = version
                        break
            else:
                self.p_version = VERSION_DEFAULT

        if self.p_version not in VERSION_SUPPORTED:
            raise ValidationError("Unsupported version")

        self.p_typenames = params.get('TYPENAMES', params.get('TYPENAME'))
        self.p_resulttype = params.get('RESULTTYPE')
        self.p_bbox = params.get('BBOX')
        self.p_srsname = params.get('SRSNAME')
        self.p_count = params.get('COUNT', params.get('MAXFEATURES'))
        self.p_startindex = params.get('STARTINDEX')

    @property
    def gml_format(self):
        return 'GML3' if self.p_version >= v110 else 'GML2'

    def response(self):
        if self.p_requset == GET_CAPABILITIES:
            return self._get_capabilities()
        elif self.p_requset == DESCRIBE_FEATURE_TYPE:
            return self._describe_feature_type()
        elif self.p_requset == GET_FEATURE:
            return self._get_feature()
        elif self.p_requset == TRANSACTION:
            return self._transaction()
        else:
            raise ValidationError("Unsupported request")

    def _get_capabilities(self):
        EM = ElementMaker(nsmap=dict(ogc=nsmap('ogc', self.p_version)))
        root = EM('WFS_Capabilities', dict(
            version=self.p_version,
            xmlns=nsmap('wfs', self.p_version)))

        # Service
        __s = El('Service', parent=root)
        El('Name', parent=__s, text='WFS Server')
        El('Title', parent=__s, text='Web Feature Service Server')
        El('Abstract', parent=__s, text='Supports WFS')
        El('OnlineResource', parent=__s)

        # Capability
        __c = El('Capability', parent=root)
        __r = El('Request', parent=__c)

        wfs_url = self.request.route_url('wfsserver.wfs', id=self.resource.id) + '?'
        for wfs_operation in WFS_OPERATIONS:
            __wfs_op = El(wfs_operation, parent=__r)
            if wfs_operation == DESCRIBE_FEATURE_TYPE:
                __lang = El('SchemaDescriptionLanguage', parent=__wfs_op)
                El('XMLSCHEMA', parent=__lang)
            if wfs_operation == GET_FEATURE:
                __format = El('ResultFormat', parent=__wfs_op)
                El(self.gml_format, parent=__format)
            for request_method in ('Get', 'Post'):
                __dcp = El('DCPType', parent=__wfs_op)
                __http = El('HTTP', parent=__dcp)
                El(request_method, dict(onlineResource=wfs_url), parent=__http)

        # FeatureTypeList
        __list = El('FeatureTypeList', parent=root)
        __ops = El('Operations', parent=__list)
        El('Query', parent=__ops)

        for layer in self.resource.layers:
            feature_layer = layer.resource
            if not feature_layer.has_permission(DataScope.read, self.request.user):
                continue
            __type = El('FeatureType', parent=__list)
            El('Name', parent=__type, text=layer.keyname)
            El('Title', parent=__type, text=layer.display_name)
            El('Abstract', parent=__type)
            El('SRS', parent=__type, text="EPSG:%s" % layer.resource.srs_id)

            __ops = El('Operations', parent=__type)
            if feature_layer.has_permission(DataScope.write, self.request.user):
                El('Insert', parent=__ops)
                El('Update', parent=__ops)
                El('Delete', parent=__ops)

            extent = feature_layer.extent
            bbox = dict(maxx=str(extent['maxLon']), maxy=str(extent['maxLat']),
                        minx=str(extent['minLon']), miny=str(extent['minLat']))
            El('LatLongBoundingBox', bbox, parent=__type)

        # Filter_Capabilities
        _ns_ogc = nsmap('ogc', self.p_version)
        __filter = El('Filter_Capabilities', namespace=_ns_ogc, parent=root)

        __sc = El('Spatial_Capabilities', namespace=_ns_ogc, parent=__filter)
        __so = El('Spatial_Operators', namespace=_ns_ogc, parent=__sc)
        El('BBOX', namespace=_ns_ogc, parent=__so)

        __sc = El('Scalar_Capabilities', namespace=_ns_ogc, parent=__filter)
        El('Logical_Operators', namespace=_ns_ogc, parent=__sc)

        return etree.tostring(root)

    def _describe_feature_type(self):
        _ns_gml = nsmap('gml', self.p_version)

        EM = ElementMaker(nsmap=dict(gml=_ns_gml))
        root = EM('schema', dict(
            targetNamespace=nsmap('wfs', self.p_version),
            elementFormDefault='qualified',
            attributeFormDefault='unqualified',
            version='0.1',
            xmlns='http://www.w3.org/2001/XMLSchema'))

        El('import', dict(
            namespace=_ns_gml,
            schemaLocation='http://schemas.opengis.net/gml/2.0.0/feature.xsd'
        ), parent=root)

        typenames = [layer.keyname for layer in self.resource.layers] \
            if self.p_typenames is None else self.p_typenames.split(',')

        if len(typenames) == 1:
            layer = Layer.filter_by(service_id=self.resource.id, keyname=typenames[0]).one()
            El('element', dict(name=layer.keyname, substitutionGroup='gml:_Feature',
                               type='%s_Type' % layer.keyname), parent=root)
            __ctype = El('complexType', dict(name="%s_Type" % layer.keyname), parent=root)
            __ccontent = El('complexContent', parent=__ctype)
            __ext = El('extension', dict(base='gml:AbstractFeatureType'), parent=__ccontent)
            __seq = El('sequence', parent=__ext)
            for field in layer.resource.fields:
                if field.datatype == FIELD_TYPE.REAL:
                    datatype = 'double'
                else:
                    datatype = field.datatype.lower()
                El('element', dict(minOccurs='0', name=field.keyname, type=datatype), parent=__seq)

            if layer.resource.geometry_type not in GEOM_TYPE_TO_GML_TYPE:
                raise ValidationError("Geometry type not supported: %s"
                                      % layer.resource.geometry_type)
            El('element', dict(minOccurs='0', name='geom', type=GEOM_TYPE_TO_GML_TYPE[
                layer.resource.geometry_type]), parent=__seq)
        else:
            for keyname in typenames:
                import_url = self.request.route_url(
                    'wfsserver.wfs', id=self.resource.id,
                    _query=dict(REQUEST='DescribeFeatureType', TYPENAME=keyname))
                El('import', dict(schemaLocation=import_url), parent=root)

        return etree.tostring(root)

    def _get_feature(self):
        _ns_wfs = nsmap('wfs', self.p_version)
        _ns_gml = nsmap('gml', self.p_version)

        layer = Layer.filter_by(service_id=self.resource.id, keyname=self.p_typenames).one()
        feature_layer = layer.resource
        self.request.resource_permission(DataScope.read, feature_layer)

        EM = ElementMaker(namespace=_ns_wfs, nsmap=dict(
            gml=_ns_gml, wfs=_ns_wfs,
            ogc=nsmap('ogc', self.p_version), xsi=nsmap('xsi', self.p_version)
        ))
        schema_location = ' '.join((
            _ns_wfs,
            _ns_gml,
            'http://schemas.opengis.net/gml/3.2.1/gml.xsd',
            'http://schemas.opengis.net/wfs/2.0.0/wfs.xsd' if self.p_version >= v200
            else 'http://schemas.opengeospatial.net/wfs/1.0.0/WFS-basic.xsd'
        ))
        root = EM('FeatureCollection', {ns_attr('xsi', 'schemaLocation', self.p_version): schema_location})  # NOQA: E501

        query = feature_layer.feature_query()

        def parse_srs(value):
            # 'urn:ogc:def:crs:EPSG::3857' -> 3857
            return int(value.split(':')[-1])

        if self.p_bbox is not None:
            bbox_param = self.p_bbox.split(',')
            box_coords = map(float, bbox_param[:4])
            box_srid = parse_srs(bbox_param[4]) if len(bbox_param) == 5 else None
            box_geom = box(*box_coords, srid=box_srid)
            query.intersects(box_geom)

        if self.p_count is not None:
            limit = int(self.p_count)
            offset = 0 if self.p_startindex is None else int(self.p_startindex)
            query.limit(limit, offset)

        count = 0

        if self.p_resulttype == 'hits':
            matched = query().total_count
        else:
            query.geom()

            if self.p_srsname is not None:
                srs_id = parse_srs(self.p_srsname)
                srs_out = feature_layer.srs \
                    if srs_id == feature_layer.srs_id \
                    else SRS.filter_by(id=srs_id).one()
            else:
                srs_out = feature_layer.srs
            query.srs(srs_out)

            osr_out = osr.SpatialReference()
            osr_out.ImportFromWkt(srs_out.wkt)

            for feature in query():
                feature_id = str(feature.id)
                __member = El('featureMember', {ns_attr('gml', 'id', self.p_version): feature_id},
                              parent=root, namespace=_ns_gml)
                __feature = El(layer.keyname, dict(fid=feature_id), parent=__member)

                geom = ogr.CreateGeometryFromWkb(feature.geom.wkb, osr_out)
                gml = geom.ExportToGML(['FORMAT=%s' % self.gml_format, 'NAMESPACE_DECL=YES'])
                __geom = El('geom', parent=__feature)
                __gml = etree.fromstring(gml)
                __geom.append(__gml)

                for field in feature.fields:
                    _field = El(field, parent=__feature)
                    value = feature.fields[field]
                    if value is not None:
                        if not isinstance(value, text_type):
                            value = str(value)
                        _field.text = value
                    else:
                        _field.set(ns_attr('xsi', 'nil', self.p_version), 'true')

                count += 1

            matched = count

        if self.p_version == v110:
            root.set('numberOfFeatures', str(count))
        elif self.p_version >= v200:
            root.set('numberMatched', str(matched))
            root.set('numberReturned', str(count))

        if self.p_version >= v110:
            root.set('timeStamp', datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%S.%f"))

        return etree.tostring(root)

    def _transaction(self):
        v_gt200 = self.p_version >= v200

        _ns_wfs = nsmap('wfs', self.p_version)
        _ns_ogc = nsmap('ogc', self.p_version)

        layers = dict()

        def find_layer(keyname):
            if keyname not in layers:
                layer = Layer.filter_by(service_id=self.resource.id, keyname=keyname).one()
                feature_layer = layer.resource
                self.request.resource_permission(DataScope.write, feature_layer)
                layers[keyname] = feature_layer
            return layers[keyname]

        EM = ElementMaker(namespace=_ns_wfs, nsmap=dict(
            wfs=_ns_wfs, ogc=_ns_ogc, xsi=nsmap('xsi', self.p_version)))
        _response = EM('TransactionResponse', dict(version='1.0.0'))

        _summary = El('TransactionSummary', namespace=_ns_wfs, parent=_response)
        summary = dict(totalInserted=0, totalUpdated=0, totalDeleted=0)

        for _operation in self.root_body:
            if _operation.tag == ns_attr('wfs', 'Insert', self.p_version):
                _layer = _operation[0]
                keyname = ns_trim(_layer.tag)
                feature_layer = find_layer(keyname)

                feature = Feature()

                geom_column = get_geom_column(feature_layer)

                for _property in _layer:
                    key = ns_trim(_property.tag)
                    if key == geom_column:
                        feature.geom = geom_from_gml(_property[0])
                    else:
                        feature.fields[key] = _property.text

                fid = feature_layer.feature_create(feature)

                _insert = El('InsertResult', namespace=_ns_wfs, parent=_response)
                El('FeatureId', dict(fid=str(fid)), namespace=_ns_ogc, parent=_insert)

                summary['totalInserted'] += 1
            else:
                keyname = ns_trim(_operation.get('typeName'))
                feature_layer = find_layer(keyname)

                _filter = _operation.find(ns_attr('ogc', 'Filter', self.p_version))
                resid_tag = 'ResourceId' if v_gt200 else 'FeatureId'
                resid_attr = 'rid' if v_gt200 else 'fid'
                _feature_id = _filter.find(ns_attr('ogc', resid_tag, self.p_version))
                fid = int(_feature_id.get(resid_attr))

                if _operation.tag == ns_attr('wfs', 'Update', self.p_version):
                    query = feature_layer.feature_query()
                    query.filter_by(id=fid)
                    feature = query().one()
                    for _property in _operation.findall(ns_attr('wfs', 'Property', self.p_version)):
                        key = _property.find(ns_attr('wfs', 'Name', self.p_version)).text
                        _value = _property.find(ns_attr('wfs', 'Value', self.p_version))

                        geom_column = get_geom_column(feature_layer)

                        if key == geom_column:
                            feature.geom = geom_from_gml(_value[0])
                        else:
                            if _value is None:
                                value = None
                            elif _value.text is None:
                                value = ''
                            else:
                                value = _value.text
                            feature.fields[key] = value

                    feature_layer.feature_put(feature)

                    summary['totalUpdated'] += 1
                elif _operation.tag == ns_attr('wfs', 'Delete', self.p_version):
                    feature_layer.feature_delete(fid)
                    summary['totalDeleted'] += 1
                else:
                    raise NotImplementedError()

        for param, value in summary.items():
            if value > 0:
                El(param, namespace=_ns_wfs, text=str(value), parent=_summary)

        _result = El('TransactionResult', namespace=_ns_wfs, parent=_response)
        _status = El('Status', namespace=_ns_wfs, parent=_result)
        El('SUCCESS', namespace=_ns_wfs, parent=_status)

        return etree.tostring(_response)
