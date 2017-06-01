# -*- coding: utf-8 -*-
# The code is based on featureserver code.

import os

from ....FeatureServer.WebFeatureService.Transaction.TransactionAction import TransactionAction
from ...Exceptions.OperationProcessingFailedException import OperationProcessingFailedException

from lxml import etree
import re


class Update(TransactionAction):

    def __init__(self, node):
        super(Update, self).__init__(node)
        self.type = 'update'

    def setLayerName(self):
        attr = self.node.attrib
        if 'typeName' in attr:
            self.layer_name = attr['typeName']

    def createStatement100(self, datasource):
        # import ipdb; ipdb.set_trace()
        geom = self.node.xpath(
            "//*[local-name() = 'Name' and text()='" + datasource.geom_col + "']/following-sibling::*[1]/*")
        geomData = ''
        if len(geom) > 0:
            geomData = etree.tostring(geom[0], pretty_print=True)

            # Double quotes should be escaped, otherwise problems uploading to json
            pattern = re.compile(r'"')
            geomData = re.sub(pattern, '\\"', geomData)

        # TODO: FIX absolute path to the resource
        xslt = etree.parse(os.path.dirname(os.path.abspath(__file__))
                           + "/../../../resources/1.0.0/transaction/transactions.xsl")
        transform = etree.XSLT(xslt)

        result = transform(self.node,
                           datasource="'" + datasource.type + "'",
                           transactionType="'" + self.type + "'",
                           geometryAttribute="'" + datasource.geom_col + "'",
                           geometryData="'" + geomData + "'",
                           tableName="dummy",
                           tableId="'" + datasource.fid_col + "'")

        elements = result.xpath("//Statement")
        if len(elements) > 0:
            pattern = re.compile(r'\s+')
            self.setStatement(re.sub(pattern, ' ', elements[0].text))
            return
        self.setStatement(None)

    def createStatement200(self, datasource):
        # TODO: The code is almost the same as in creteStatement100.
        #  import ipdb; ipdb.set_trace()
        geom = self.node.xpath(
            "//*[local-name() = 'ValueReference' and text()='" + datasource.geom_col + "']/following-sibling::*[1]/*")
        geomData = ''
        if len(geom) > 0:
            geomData = etree.tostring(geom[0], pretty_print=True)

            # Double quotes should be escaped, otherwise problems uploading to json
            pattern = re.compile(r'"')
            geomData = re.sub(pattern, '\\"', geomData)

        # TODO: FIX absolute path to the resource
        xslt = etree.parse(os.path.dirname(os.path.abspath(__file__))
                           + "/../../../resources/2.0.0/transaction/transactions.xsl")
        transform = etree.XSLT(xslt)

        result = transform(self.node,
                           datasource="'" + datasource.type + "'",
                           transactionType="'" + self.type + "'",
                           geometryAttribute="'" + datasource.geom_col + "'",
                           geometryData="'" + geomData + "'",
                           tableName="dummy",
                           tableId="'" + datasource.fid_col + "'")

        elements = result.xpath("//Statement")
        if len(elements) > 0:
            pattern = re.compile(r'\s+')
            self.setStatement(re.sub(pattern, ' ', elements[0].text))
            return
        self.setStatement(None)

    def createStatement(self, datasource):
        """Output --- object description that should
        be output to json.
        """
        if self.version == u'1.0.0':
            self.createStatement100(datasource)
        elif self.version == u'2.0.0':
            self.createStatement200(datasource)
        else:
            raise OperationProcessingFailedException(message='Version "%s" don\'t allowed by the server' % (self.version, ))
