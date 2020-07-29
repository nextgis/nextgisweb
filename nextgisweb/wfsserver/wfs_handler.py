# -*- coding: utf-8 -*-
from __future__ import division, absolute_import, print_function, unicode_literals

from lxml import etree
from lxml.builder import ElementMaker

from osgeo import ogr, osr
from six import BytesIO, text_type

from ..feature_layer import FIELD_TYPE, GEOM_TYPE
from ..geometry import box, geom_from_wkb
from ..resource import DataScope
from ..spatial_ref_sys import SRS

from .model import Layer

# Spec: http://docs.opengeospatial.org/is/09-025r2/09-025r2.html
VERSION = '2.0.2'


nsmap = dict(
    wfs='http://www.opengis.net/wfs',
    gml='http://www.opengis.net/gml',
    ogc='http://www.opengis.net/ogc',
    fs='http://featureserver.org/fs',
    xsi='http://www.w3.org/2001/XMLSchema-instance'
)


def ns_attr(ns, attr):
    return '{{{0}}}{1}'.format(nsmap[ns], attr)


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


WFS_OPERATIONS = (
    ('GetCapabilities', ()),
    ('DescribeFeatureType', ()),
    ('GetFeature', ('GML2', )),
    ('Transaction', ('GML2', )),
)


GEOM_TYPE_TO_GML_TYPE = {
    GEOM_TYPE.POINT: 'gml:PointPropertyType',
    GEOM_TYPE.LINESTRING: 'gml:LineStringPropertyType',
    GEOM_TYPE.POLYGON: 'gml:PolygonPropertyType',
    GEOM_TYPE.MULTIPOINT: 'gml:MultiPointPropertyType',
    GEOM_TYPE.MULTILINESTRING: 'gml:MultiLineStringPropertyType',
    GEOM_TYPE.MULTIPOLYGON: 'gml:MultiPolygonPropertyType',
}


class WFSHandler():
    def __init__(self, resource, request):
        self.resource = resource
        self.request = request

        # 6.2.5.2 Parameter names shall not be case sensitive
        params = dict((k.upper(), v) for k, v in request.params.items())
        self.p_requset = params.get('REQUEST')
        self.p_typenames = params.get('TYPENAMES')
        if self.p_typenames is None:
            self.p_typenames = params.get('TYPENAME')
        self.p_resulttype = params.get('RESULTTYPE')
        self.p_bbox = params.get('BBOX')
        self.p_srsname = params.get('SRSNAME')

    def response(self):
        if self.request.method == 'GET':
            if self.p_requset == 'GetCapabilities':
                return self._get_capabilities()
            elif self.p_requset == 'DescribeFeatureType':
                return self._describe_feature_type()
            elif self.p_requset == 'GetFeature':
                return self._get_feature()
            else:
                raise NotImplementedError()
        elif self.request.method == 'POST':
            return self._transaction()
        else:
            raise NotImplementedError()

    def _get_capabilities(self):
        root = El('WFS_Capabilities', dict(version=VERSION))

        __s = El('Service', parent=root)
        El('Name', parent=__s, text='WFS Server')
        El('Title', parent=__s, text='Web Feature Service Server')
        El('Abstract', parent=__s, text='Supports WFS')

        __c = El('Capability', parent=root)
        __r = El('Request', parent=__c)

        wfs_url = self.request.route_url('wfsserver.wfs', id=self.resource.id)
        for wfs_operation, result_formats in WFS_OPERATIONS:
            __wfs_op = El(wfs_operation, parent=__r)
            for request_method in ('Get', 'Post'):
                __dcp = El('DCPType', parent=__wfs_op)
                __http = El('HTTP', parent=__dcp)
                El(request_method, dict(onlineResource=wfs_url), parent=__http)
            for result_format in result_formats:
                __format = El('ResultFormat', parent=__wfs_op)
                El(result_format, parent=__format)

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
            El('bbox', dict(maxx=str(extent['maxLon']), maxy=str(extent['maxLat']),
                            minx=str(extent['minLon']), miny=str(extent['minLat'])), parent=__type)

        return etree.tostring(root)

    def _describe_feature_type(self):
        EM = ElementMaker(nsmap=dict(gml=nsmap['gml'], fs=nsmap['fs']))
        root = EM('schema', dict(
            targetNamespace=nsmap['fs'],
            elementFormDefault='qualified',
            attributeFormDefault='unqualified',
            version='0.1',
            xmlns='http://www.w3.org/2001/XMLSchema'))

        El('import', dict(namespace=nsmap['gml'], schemaLocation='http://schemas.opengis.net/gml/2.0.0/feature.xsd'), parent=root)

        typename = self.p_typenames.split(',')
        if len(typename) == 1:
            layer = Layer.filter_by(service_id=self.resource.id, keyname=typename[0]).one()
            El('element', dict(name=layer.keyname, substitutionGroup='gml:_Feature',
                               type='fs:%s_Type' % layer.keyname), parent=root)
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
            El('element', dict(minOccurs='0', name='geom', type=GEOM_TYPE_TO_GML_TYPE[
                layer.resource.geometry_type]), parent=__seq)
        else:
            for keyname in typename:
                import_url = self.request.route_url(
                    'wfsserver.wfs', id=self.resource.id,
                    _query=dict(REQUEST='DescribeFeatureType', TYPENAME=keyname))
                El('import', dict(schemaLocation=import_url), parent=root)

        return etree.tostring(root)

    def _get_feature(self):
        layer = Layer.filter_by(service_id=self.resource.id, keyname=self.p_typenames).one()
        feature_layer = layer.resource
        self.request.resource_permission(DataScope.read, feature_layer)

        EM = ElementMaker(namespace=nsmap['wfs'], nsmap=dict(
            fs=nsmap['fs'], gml=nsmap['gml'], wfs=nsmap['wfs'],
            ogc=nsmap['ogc'], xsi=nsmap['xsi']
        ))
        root = EM('FeatureCollection', {ns_attr('xsi', 'schemaLocation'): 'http://www.opengis.net/wfs http://schemas.opengeospatial.net//wfs/1.0.0/WFS-basic.xsd'})

        query = feature_layer.feature_query()

        if self.p_resulttype == 'hits':
            root.set('numberMatched', str(query().total_count))
            root.set('numberReturned', "0")
            return etree.tostring(root)

        query.geom()

        def parse_srs(value):
            # 'urn:ogc:def:crs:EPSG::3857' -> 3857
            return int(value.split(':')[-1])

        if self.p_bbox is not None:
            bbox_param = self.p_bbox.split(',')
            box_coords = map(float, bbox_param[:4])
            box_srid = parse_srs(bbox_param[4])
            box_geom = box(*box_coords, srid=box_srid)
            query.intersects(box_geom)

        if self.p_srsname is not None:
            srs_id = parse_srs(self.p_srsname)
            srs_out = feature_layer.srs if srs_id == feature_layer.srs_id else SRS.filter_by(id=srs_id).one()
        else:
            srs_out = feature_layer.srs
        query.srs(srs_out)

        osr_out = osr.SpatialReference()
        osr_out.ImportFromWkt(srs_out.wkt)

        for feature in query():
            feature_id = str(feature.id)
            __member = El('featureMember', {ns_attr('gml', 'id'): feature_id},
                          parent=root, namespace=nsmap['gml'])
            __feature = El(layer.keyname, dict(fid=feature_id),
                           parent=__member, namespace=nsmap['fs'])

            geom = ogr.CreateGeometryFromWkb(feature.geom.wkb, osr_out)
            gml = geom.ExportToGML(['FORMAT=GML2', 'NAMESPACE_DECL=YES'])
            __geom = El('geom', parent=__feature, namespace=nsmap['fs'])
            __gml = etree.fromstring(gml)
            __geom.append(__gml)

            for field in feature.fields:
                value = feature.fields[field]
                if not isinstance(value, text_type):
                    value = str(value)
                El(field, parent=__feature, namespace=nsmap['fs'], text=value)

        return etree.tostring(root)

    def _transaction(self):
        root = etree.parse(BytesIO(self.request.body)).getroot()
        if root.tag != ns_attr('wfs', 'Transaction'):
            raise NotImplementedError()

        layers = dict()

        def find_layer(keyname):
            if keyname not in layers:
                layer = Layer.filter_by(service_id=self.resource.id, keyname=keyname).one()
                feature_layer = layer.resource
                self.request.resource_permission(DataScope.write, feature_layer)
                layers[keyname] = feature_layer
            return layers[keyname]

        EM = ElementMaker(namespace=nsmap['wfs'], nsmap=dict(
            wfs=nsmap['wfs'], ogc=nsmap['ogc'], xsi=nsmap['xsi']))
        _response = EM('TransactionResponse', dict(version='1.0.0'))
        _summary = El('TransactionSummary', namespace=nsmap['wfs'], parent=_response)

        _operation = root[0]
        keyname = _operation.get('typeName')
        feature_layer = find_layer(keyname)
        _filter = _operation.find(ns_attr('ogc', 'Filter'))
        _feature_id = _filter.find(ns_attr('ogc', 'FeatureId'))
        fid = int(_feature_id.get('fid'))

        if _operation.tag == ns_attr('wfs', 'Update'):
            _property = _operation.find(ns_attr('wfs', 'Property'))
            key = _property.find(ns_attr('wfs', 'Name')).text
            _value = _property.find(ns_attr('wfs', 'Value'))

            query = feature_layer.feature_query()
            query.filter_by(id=fid)
            feature = query().one()

            geom_column = feature_layer.column_geom \
                if hasattr(feature_layer, 'column_geom') else 'geom'

            if key == geom_column:
                value = etree.tostring(_value[0])
                ogr_geom = ogr.CreateGeometryFromGML(value)
                feature.geom = geom_from_wkb(ogr_geom.ExportToWkb())
            elif key in feature.fields:
                feature.fields[key] = _value.text
            else:
                raise KeyError("Property %s not found" % key)

            feature_layer.feature_put(feature)

            El('totalUpdated', namespace=nsmap['wfs'], text='1', parent=_summary)
        elif _operation.tag == ns_attr('wfs', 'Delete'):
            feature_layer.feature_delete(fid)
            El('totalDeleted', namespace=nsmap['wfs'], text='1', parent=_summary)
        else:
            raise NotImplementedError()

        _result = El('TransactionResult', namespace=nsmap['wfs'], parent=_response)
        _status = El('Status', namespace=nsmap['wfs'], parent=_result)
        El('SUCCESS', namespace=nsmap['wfs'], parent=_status)

        return etree.tostring(_response)
