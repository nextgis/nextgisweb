# -*- coding: utf-8 -*-

from ...vectorformats.Formats.Format import Format
from lxml import etree
import geojson

import os

import datetime

try:
    import osgeo.ogr as ogr
except ImportError:
    import ogr


XMLDATADIR = os.path.join(os.path.dirname(__file__), "../../resources/")


class WFS(Format):

    """WFS-like GML writer."""
    layername = "layer"
    namespaces = {'fs': 'http://featureserver.org/fs',
                  'wfs': 'http://www.opengis.net/wfs',
                  'ogc': 'http://www.opengis.net/ogc',
                  'xsd': 'http://www.w3.org/2001/XMLSchema',
                  'gml': 'http://www.opengis.net/gml',
                  'ows': 'http://www.opengis.net/ows/1.1',
                  'xlink': 'http://www.w3.org/1999/xlink',
                  'xsi': 'http://www.w3.org/2001/XMLSchema-instance'}

    def encode(self, features, params):
        # import ipdb; ipdb.set_trace()
        use_GML2 = True
        if 'outputformat' in params:
            use_GML2 = (params['outputformat'] == 'GML2')
        else:
            if 'version' in params:
                version = params['version']
                if version == '2.0.0':
                    use_GML2 = False
                elif version == '1.0.0':
                    pass
                else:
                    raise ValueError
        if use_GML2:
            results = self.encodeGML2(features, params)
        else:
            results = self.encodeGML3(features, params)
        return results

    def encodeGML2(self, features, params):
        results = ["""<?xml version="1.0" ?><wfs:FeatureCollection
   xmlns:fs="http://featureserver.org/fs"
   xmlns:wfs="http://www.opengis.net/wfs"
   xmlns:gml="http://www.opengis.net/gml"
   xmlns:ogc="http://www.opengis.net/ogc"
   xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
   xsi:schemaLocation="http://www.opengis.net/wfs http://schemas.opengeospatial.net//wfs/1.0.0/WFS-basic.xsd">
        """]
        for feature in features:
            results.append(
                self.encode_featureGML(
                    feature, params, gml_format=['FORMAT=GML2']
                )
            )
        results.append("""</wfs:FeatureCollection>""")

        return "\n".join(results)

    def encodeGML3(self, features, params):
        current_datetime = datetime.datetime.now().isoformat()

        results = ["""<?xml version="1.0" ?>
        <wfs:FeatureCollection
        timeStamp="%s"
        numberMatched="unknown"
        numberReturned="%s"
        xmlns:fs="http://featureserver.org/fs"
        xmlns:wfs="http://www.opengis.net/wfs/2.0"
        xmlns:gml="http://www.opengis.net/gml/3.2"
        xmlns:xlink="http://www.w3.org/1999/xlink"
        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xsi:schemaLocation="http://www.opengis.net/wfs/2.0
                http://schemas.opengis.net/wfs/2.0.0/wfs.xsd
                http://www.opengis.net/gml/3.2
                http://schemas.opengis.net/gml/3.2.1/gml.xsd">
        """ % (current_datetime, len(features))]
        for feature in features:
            results.append(
                self.encode_featureGML(
                    feature, params, gml_format=['FORMAT=GML3']
                )
            )

        results.append("""</wfs:FeatureCollection>\n""")

        return "\n".join(results)

    def encode_featureGML(self, feature, params, gml_format=['FORMAT=GML2']):
        layername = self.layername

        attr_fields = []
        for key, value in feature.properties.items():
            attr_value = self._encode_attr_value(value)
            attr_fields.append("<fs:%s>%s</fs:%s>" % (key, attr_value, key))

        xml = "<gml:featureMember gml:id=\"%s\"><fs:%s fid=\"%s\">" % (
            str(feature.id), layername, str(feature.id))

        if hasattr(feature, "geometry_attr"):
            xml += "<fs:%s>%s</fs:%s>" % (
                feature.geometry_attr, self.geometry_to_gml(
                    feature.geometry, feature.srs, gml_format),
                feature.geometry_attr)
        else:
            xml += self.geometry_to_gml(feature.geometry,
                                        feature.srs, gml_format)

        xml += "%s</fs:%s></gml:featureMember>" % (
            "\n".join(attr_fields), layername)

        return xml

    def _encode_attr_value(self, attr_value):
        if hasattr(attr_value, "replace"):
            try:
                attr_value = attr_value.replace("&", "&amp;").replace(
                    "<", "&lt;").replace(">", "&gt;")
            except:
                pass
        if attr_value is None:
            attr_value = ''
        if isinstance(attr_value, str):
            attr_value = unicode(attr_value, "utf-8")
        return attr_value

    def geometry_to_gml(self, geometry, srs, format=['FORMAT=GML2']):
        """
        >>> w = WFS()
        >>> print w.geometry_to_gml({'type':'Point', 'coordinates':[1.0,2.0]})
        <gml:Point><gml:coordinates>1.0,2.0</gml:coordinates></gml:Point>
        >>> w.geometry_to_gml({'type':'LineString', 'coordinates':[[1.0,2.0],[2.0,1.0]]})
        '<gml:LineString><gml:coordinates>1.0,2.0 2.0,1.0</gml:coordinates></gml:LineString>'
        """

        if geometry['type'].lower() in \
                ['point', 'linestring', 'polygon', 'multipolygon', 'multilinestring', 'multipoint']:
            geom_wkt = ogr.CreateGeometryFromJson(geojson.dumps(geometry))

            osrs = ogr.osr.SpatialReference()
            osrs.ImportFromEPSG(srs)
            geom_wkt.AssignSpatialReference(osrs)

            gml = geom_wkt.ExportToGML(format)
            return gml
        else:
            raise Exception(
                "Could not convert geometry of type %s." % geometry['type'])

    def encode_exception_report(self, exceptionReport):
        results = ["""<?xml version="1.0" encoding="UTF-8"?>
        <ExceptionReport xmlns="http://www.opengis.net/ows/1.1"
        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xsi:schemaLocation="http://www.opengis.net/ows/1.1 owsExceptionReport.xsd"
        version="1.0.0"
        xml:lang="en">
        """]
        for exception in exceptionReport:
            results.append("<Exception exceptionCode=\"%s\" locator=\"%s\" layer=\"%s\"><ExceptionText>%s</ExceptionText><ExceptionDump>%s</ExceptionDump></Exception>" %
                           (exception.code, exception.locator, exception.layer, exception.message, exception.dump))
        results.append("""</ExceptionReport>""")
        return "\n".join(results)

    def encode_transaction(self, response, **params):
        failedCount = 0

        summary = response.getSummary()

        if 'version' in params:
            wfs_version = str(params['version'])
        else:
            wfs_version = '1.0.0'

        inserted = '<wfs:totalInserted>%s</wfs:totalInserted>' % \
                   (str(summary.getTotalInserted()),
                    ) if summary.getTotalInserted() > 0 else ''
        updated = '<wfs:totalUpdated>%s</wfs:totalUpdated>' % \
            (str(summary.getTotalUpdated()),
             ) if summary.getTotalUpdated() > 0 else ''
        deleted = '<wfs:totalDeleted>%s</wfs:totalDeleted>' % \
            (str(summary.getTotalDeleted()),
             ) if summary.getTotalDeleted() > 0 else ''
        replaced = '<wfs:totalReplaced>%s</wfs:totalReplaced>' % \
                   (str(summary.getTotalReplaced()),
                    ) if summary.getTotalReplaced() > 0 else ''

        result = """<?xml version="1.0" ?>
<wfs:TransactionResponse
version="%s"
    xmlns:wfs="http://www.opengis.net/wfs"
    xmlns:ogc="http://www.opengis.net/ogc"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xsi:schemaLocation="http://www.opengis.net/wfs ../wfs/2.0.0/WFS-transaction.xsd">

    <wfs:TransactionSummary>
        %s %s %s %s
    </wfs:TransactionSummary>
           """ % (wfs_version, inserted, updated, deleted, replaced)

        insertResult = response.getInsertResults()
        if summary.getTotalInserted() > 0:
            body = ''
            for insert in insertResult:
                if wfs_version == '2.0.0':
                    body += '''
                    <fes:ResourceId rid="%s"/>
                    ''' % (str(insert.getResourceId()), )
                elif wfs_version == '1.0.0':
                     body += '''
                    <ogc:FeatureId fid="%s"/>
                    ''' % (str(insert.getResourceId()), )


            if len(insert.getHandle()) > 0:
                header = '<wfs:InsertResult handle="%s">' % (str(insert.getHandle()), )
            else:
                header = '<wfs:InsertResult>'
            tail = """</wfs:InsertResult>"""

            result += header + body + tail

        updateResult = response.getUpdateResults()
        # if summary.getTotalUpdated() > 0:
        #     result += "<wfs:UpdateResults>"
        #     for update in updateResult:
        #         result += """<wfs:Feature handle="%s">
        #                 <ogc:ResourceId fid="%s"/>
        #             </wfs:Feature>""" % (str(insert.getHandle()), str(update.getResourceId()))
        #         if len(update.getHandle()) > 0:
        #             failedCount += 1
        #     result += """</wfs:UpdateResults>"""

        replaceResult = response.getReplaceResults()
        # if summary.getTotalReplaced() > 0:
        #     result += "<wfs:ReplaceResults>"
        #     for replace in replaceResult:
        #         result += """<wfs:Feature handle="%s">
        #                 <ogc:ResourceId fid="%s"/>
        #             </wfs:Feature>""" % (str(replace.getHandle()), str(replace.getResourceId()))
        #         if len(replace.getHandle()) > 0:
        #             failedCount += 1
        #     result += """</wfs:ReplaceResults>"""

        deleteResult = response.getDeleteResults()
        # if summary.getTotalDeleted() > 0:
        #     result += "<wfs:DeleteResults>"
        #     for delete in deleteResult:
        #         result += """<wfs:Feature handle="%s">
        #             <ogc:ResourceId fid="%s"/>
        #             </wfs:Feature>""" % (str(delete.getHandle()), str(delete.getResourceId()))
        #         if len(delete.getHandle()) > 0:
        #             failedCount += 1
        #     result += """</wfs:DeleteResults>"""

        result += """<wfs:TransactionResult>
                        <wfs:Status>"""

        if (len(insertResult) + len(updateResult) + len(replaceResult)) == failedCount and failedCount > 0:
            result += "<wfs:FAILED/>"
        elif (len(insertResult) + len(updateResult) + len(replaceResult)) > failedCount and failedCount > 0:
            result += "<wfs:PARTIAL/>"
        else:
            result += "<wfs:SUCCESS/>"

        result += """</wfs:Status>
                </wfs:TransactionResult>"""

        result += """</wfs:TransactionResponse>"""
        return result

    def getcapabilities200(self, tree):
        '''Return GetCapabilities responce for 2.0.0 version

        :param tree:    XML pattren of responce
        :type tree:     lxml element
        '''
        root = tree.getroot()

        elements = root.xpath(
            "ows:OperationsMetadata/*/ows:DCP/ows:HTTP",
            namespaces=self.namespaces)
        if len(elements) > 0:
            for element in elements:
                for method in element:
                    method.attrib['{%s}href' % (self.namespaces['xlink'])] = \
                        self.host + '?'

        # Currently NGW uses one layer and datasource
        # so to set maxfeature we need to
        # select from datasources single datasource
        # and use it. If there are several datasources -- ignore
        # extracting maxfeature, so we don't break work of other
        # datasources (not from NGW)
        if len(self.layers) == 1:
            datasource = self.datasources[self.layers[0]]
            maxfeatures = datasource.default_maxfeatures
            if maxfeatures is not None:
                count_elements = root.xpath(
                    "ows:OperationsMetadata/ows:Constraint[@name='CountDefault']/ows:DefaultValue",
                    namespaces=self.namespaces)
                for e in count_elements:
                    e.text = str(maxfeatures)

        layers = self.getlayers()
        featureList = root.xpath("//*[local-name() = 'FeatureTypeList']")
        if len(featureList) > 0 and len(layers) > 0:
            for layer in layers:
                featureList[0].append(layer)

        return tree

    def getcapabilities100(self, tree):
        '''Return GetCapabilities responce for 1.0.0 version

        :param tree:    XML pattren of responce
        :type tree:     lxml element
        '''
        root = tree.getroot()

        elements = root.xpath(
            "wfs:Capability/wfs:Request/wfs:GetCapabilities/wfs:DCPType/wfs:HTTP",
            namespaces=self.namespaces)
        if len(elements) > 0:
            for element in elements:
                for http in element:
                    http.set('onlineResource', self.host + '?')

        elements = root.xpath(
            "wfs:Capability/wfs:Request/wfs:DescribeFeatureType/wfs:DCPType/wfs:HTTP",
            namespaces=self.namespaces)
        if len(elements) > 0:
            for element in elements:
                for http in element:
                    http.set('onlineResource', self.host + '?')

        elements = root.xpath(
            "wfs:Capability/wfs:Request/wfs:GetFeature/wfs:DCPType/wfs:HTTP",
            namespaces=self.namespaces)
        if len(elements) > 0:
            for element in elements:
                for http in element:
                    http.set('onlineResource', self.host + '?')

        elements = root.xpath(
            "wfs:Capability/wfs:Request/wfs:Transaction/wfs:DCPType/wfs:HTTP",
            namespaces=self.namespaces)
        if len(elements) > 0:
            for element in elements:
                for http in element:
                    http.set('onlineResource', self.host + '?')

        layers = self.getlayers()
        featureList = root.xpath(
            "wfs:FeatureTypeList", namespaces=self.namespaces)
        if len(featureList) > 0 and len(layers) > 0:
            for layer in layers:
                featureList[0].append(layer)

        return tree

    def getcapabilities(self, version, datasource=None):

        try:
            tree = etree.parse(os.path.join(XMLDATADIR, version,
                                            "wfs-capabilities.xml"))
        except IOError:
            # TODO: raise exception about wrong version number
            raise

        if version == '1.0.0':
            tree = self.getcapabilities100(tree)
        elif version == '2.0.0':
            tree = self.getcapabilities200(tree)
        else:
            raise NotImplementedError

        return etree.tostring(tree, pretty_print=True, encoding='utf-8')

    def getlayers(self):
        ''' '''
        featureList = etree.Element('FeatureTypeList')
        operations = etree.Element('Operations')
        operations.append(etree.Element('Query'))
        featureList.append(operations)

        for layer in self.layers:
            type = etree.Element('FeatureType')
            name = etree.Element('Name')
            name.text = layer
            type.append(name)

            title = etree.Element('Title')
            if hasattr(self.datasources[layer], 'title'):
                title.text = self.datasources[layer].title
            type.append(title)

            abstract = etree.Element('Abstract')
            if hasattr(self.datasources[layer], 'abstract'):
                abstract.text = self.datasources[layer].abstract
            type.append(abstract)

            srs = etree.Element('SRS')
            if hasattr(self.datasources[layer], 'srid_out') and self.datasources[layer].srid_out is not None:
                srs.text = 'EPSG:' + str(self.datasources[layer].srid_out)
            else:
                srs.text = 'EPSG:4326'
            type.append(srs)

            featureOperations = etree.Element('Operations')
            featureOperations.append(etree.Element('Insert'))
            featureOperations.append(etree.Element('Update'))
            featureOperations.append(etree.Element('Delete'))
            type.append(featureOperations)

            latlong = self.getBBOX(self.datasources[layer])
            type.append(latlong)

            featureList.append(type)

        return featureList

    def describefeaturetype(self):
        tree = etree.parse(os.path.join(XMLDATADIR, "wfs-featuretype.xsd"))
        root = tree.getroot()

        if len(self.layers) == 1:
            ''' special case when only one datasource is requested --> other xml schema '''
            root = self.addDataSourceFeatureType(
                root, self.datasources[self.layers[0]])
        else:
            ''' loop over all requested datasources '''
            for layer in self.layers:
                root = self.addDataSourceImport(root, self.datasources[layer])
                # root = self.addDataSourceFeatureType(root,
                # self.datasources[layer])

        return etree.tostring(tree, pretty_print=True, encoding='utf-8')

    def addDataSourceImport(self, root, datasource):
        root.append(
            etree.Element(
                'import', attrib={'namespace': self.namespaces['fs'],
                                  'schemaLocation': self.host + '?request=DescribeFeatureType&typeName=' + datasource.name})
        )
        return root

    def addDataSourceFeatureType(self, root, datasource):

        root.append(etree.Element('element', attrib={'name': datasource.name,
                                                     'type': 'fs:' + datasource.name + '_Type',
                                                     'substitutionGroup': 'gml:_Feature'}))

        complexType = etree.Element(
            'complexType', attrib={'name': datasource.name + '_Type'})
        complexContent = etree.Element('complexContent')
        extension = etree.Element(
            'extension', attrib={'base': 'gml:AbstractFeatureType'})
        sequence = etree.Element('sequence')

        for attribut_col in datasource.get_attribute_cols():
            type, length = datasource.getAttributeDescription(attribut_col)

            attrib_name = attribut_col
            if hasattr(datasource, "hstore"):
                if datasource.hstore:
                    attrib_name = self.getFormatedAttributName(attrib_name)

            element = etree.Element(
                'element', attrib={'name': attrib_name,
                                   'minOccurs': '0',
                                   'type': type
                                   })

            sequence.append(element)

        if hasattr(datasource, 'geometry_type'):
            properties = datasource.geometry_type.split(',')
        else:
            properties = ['Point', 'Line', 'Polygon', 'MultiPoint', 'MultiLine', 'MultiPolygon',]
        for property in properties:
            if property == 'MultiPoint':
                element = etree.Element(
                    'element', attrib={'name': datasource.geom_col,
                                       'type': 'gml:MultiPointPropertyType',
                                       'minOccurs': '0'})
                sequence.append(element)
            elif property == 'MultiLine':
                element = etree.Element(
                    'element', attrib={'name': datasource.geom_col,
                                       'type': 'gml:MultiLineStringPropertyType',
                                       # 'ref' : 'gml:curveProperty',
                                       'minOccurs': '0'})
                sequence.append(element)
            elif property == 'MultiPolygon':
                element = etree.Element(
                    'element', attrib={'name': datasource.geom_col,
                                       'type': 'gml:MultiPolygonPropertyType',
                                       # 'substitutionGroup' : 'gml:_Surface',
                                       'minOccurs': '0'})
                sequence.append(element)
            if property == 'Point':
                element = etree.Element(
                    'element', attrib={'name': datasource.geom_col,
                                       'type': 'gml:PointPropertyType',
                                       'minOccurs': '0'})
                sequence.append(element)
            elif property == 'Line':
                element = etree.Element(
                    'element', attrib={'name': datasource.geom_col,
                                       'type': 'gml:LineStringPropertyType',
                                       # 'ref' : 'gml:curveProperty',
                                       'minOccurs': '0'})
                sequence.append(element)
            elif property == 'Polygon':
                element = etree.Element(
                    'element', attrib={'name': datasource.geom_col,
                                       'type': 'gml:PolygonPropertyType',
                                       # 'substitutionGroup' : 'gml:_Surface',
                                       'minOccurs': '0'})
                sequence.append(element)


        extension.append(sequence)
        complexContent.append(extension)
        complexType.append(complexContent)
        root.append(complexType)

        return root

    def getBBOX(self, datasource):
        if hasattr(datasource, 'bbox'):
            latlong = datasource.bbox
        else:
            latlong = datasource.getBBOX()
        latlongArray = latlong.split(' ')

        return etree.Element('bbox',
                             attrib={'minx': latlongArray[0],
                                     'miny': latlongArray[1],
                                     'maxx': latlongArray[2],
                                     'maxy': latlongArray[3]})
