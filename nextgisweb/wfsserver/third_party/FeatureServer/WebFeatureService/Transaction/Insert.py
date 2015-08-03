# -*- coding: utf-8 -*-

'''
Created on Oct 16, 2011

@author: michel
'''
import os
import re
from ....FeatureServer.WebFeatureService.Transaction.TransactionAction import TransactionAction
from lxml import etree


class Insert(TransactionAction):

    def __init__(self, node):
        super(Insert, self).__init__(node)
        self.type = 'insert'

    def setLayerName(self):
        self.layer_name = self.node.xpath('local-name()')

    def createStatement(self, datasource):
        """На выходе --- описание объекта, который нужно вставить
        в формате json.
        """
        geom = self.node.xpath(
            "//*[local-name() = '" + datasource.geom_col + "']/*")
        geomData = etree.tostring(geom[0], pretty_print=True)

        # Двойные кавычки нужно экранировать, иначе будут проблемы при загрузке в json
        pattern = re.compile(r'"')
        geomData = re.sub(pattern, '\\"', geomData)

        xslt = etree.parse(os.path.dirname(os.path.abspath(__file__))
                           + "/../../../resources/transaction/transactions.xsl")
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
