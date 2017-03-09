# -*- coding: utf-8 -*-

# The code is based on FeatureServer code

import os
import re
from ....FeatureServer.WebFeatureService.Transaction.TransactionAction import TransactionAction
from ...Exceptions.OperationProcessingFailedException import OperationProcessingFailedException
from lxml import etree


class Insert(TransactionAction):

    def __init__(self, node):
        super(Insert, self).__init__(node)
        self.type = 'insert'

    def setLayerName(self):
        self.layer_name = self.node.xpath('local-name()')

    def createStatement100(self, datasource):
        '''Create statement for WFS 1.0.0
        '''
        geom = self.node.xpath(
            "//*[local-name() = '" + datasource.geom_col + "']/*")
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
                           tableName='dummy')
        elements = result.xpath("//Statement")
        if len(elements) > 0:
            pattern = re.compile(r'\s+')
            result = re.sub(pattern, ' ', elements[0].text)
            self.setStatement(result)
            return
        self.setStatement(None)

    def createStatement200(self, datasource):
        '''Create statement for WFS 2.0.0
        '''

        # TODO: The code is almost the same as in creteStatement100.
        # Refactor it.
        geom = self.node.xpath(
             "//*[local-name() = '" + datasource.geom_col + "']/*")
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
                           geometryData="'" + geomData + "'",
                           geometryAttribute="'" + datasource.geom_col + "'",
                           tableName='dummy')
        elements = result.xpath("//Statement")
        if len(elements) > 0:
            pattern = re.compile(r'\s+')
            result = re.sub(pattern, ' ', elements[0].text)
            self.setStatement(result)
            return
        self.setStatement(None)



    def createStatement(self, datasource):
        """Output --- object description that should
        be output to json.
        """
        # import ipdb; ipdb.set_trace()
        if self.version == u'1.0.0':
            self.createStatement100(datasource)
        elif self.version == u'2.0.0':
            self.createStatement200(datasource)
        else:
            raise OperationProcessingFailedException(message='Version "%s" don\'t allowed by the server' % (self.version, ))
