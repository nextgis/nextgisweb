# -*- coding: utf-8 -*-

'''
Created on Oct 16, 2011

@author: michel
'''

import os
from ....FeatureServer.WebFeatureService.Transaction.TransactionAction import TransactionAction
from ...Exceptions.OperationProcessingFailedException import OperationProcessingFailedException

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

    def createStatement100(self, datasource):
        """На выходе --- список идентификаторов объектов, которые нужно удалить
        в формате json
        """
        # TODO: FIX absolute path to the resource
        xslt = etree.parse(os.path.dirname(os.path.abspath(__file__))
                           + "/../../../resources/1.0.0/transaction/transactions.xsl")
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

    def createStatement200(self, datasource):
        """На выходе --- список идентификаторов объектов, которые нужно удалить
        в формате json
        """
        # TODO: the code is very similar to code of createStatement100. Refactor it

        # TODO: FIX absolute path to the resource
        xslt = etree.parse(os.path.dirname(os.path.abspath(__file__))
                           + "/../../../resources/2.0.0/transaction/transactions.xsl")
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

    def createStatement(self, datasource):
        """На выходе --- список идентификаторов объектов, которые нужно удалить
        в формате json
        """
        if self.version == u'1.0.0':
            self.createStatement100(datasource)
        elif self.version == u'2.0.0':
            self.createStatement200(datasource)
        else:
            raise OperationProcessingFailedException(message='Version "%s" don\'t allowed by the server' % (self.version, ))
