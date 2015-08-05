# -*- coding: utf-8 -*-

'''
Created on Oct 16, 2011

@author: michel
'''

import os
from ....FeatureServer.WebFeatureService.Transaction.TransactionAction import TransactionAction
from lxml import etree
import re


class Delete(TransactionAction):

    def __init__(self, node):
        super(Delete, self).__init__(node)
        self.type = 'delete'

    def setLayerName(self):
        attr = self.node.attrib
        if 'typeName' in attr:
            self.layer_name = attr['typeName']

    def createStatement(self, datasource):
        """На выходе --- список идентификаторов объектов, которые нужно удалить
        в формате json
        """
        xslt = etree.parse(os.path.dirname(os.path.abspath(__file__))
                           + "/../../../resources/transaction/transactions.xsl")
        transform = etree.XSLT(xslt)

        result = transform(self.node,
                           datasource="'" + datasource.type + "'",
                           transactionType="'" + self.type + "'",
                           tableName="dummy",
                           tableId="dummy")
        elements = result.xpath("//Statement")
        if len(elements) > 0:
            pattern = re.compile(r'\s+')
            self.setStatement(re.sub(pattern, ' ', str(elements[0])))
            return
        self.setStatement(None)
