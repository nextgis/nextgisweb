# -*- coding: utf-8 -*-
# The code is based on featureserver code.

import os
from ....FeatureServer.WebFeatureService.Transaction.TransactionAction import TransactionAction
from lxml import etree
import re

class Update(TransactionAction):
    
    def __init__(self, node):
        super(Update, self).__init__(node)
        self.type = 'update'
        
    def createStatement(self, datasource):

        geom = self.node.xpath("//*[local-name() = 'Name' and text()='"+datasource.geom_col+"']/following-sibling::*[1]/*")
        geomData = ''
        if len(geom) > 0:
            geomData = etree.tostring(geom[0], pretty_print=True)

            # Двойные кавычки нужно экранировать, иначе будут проблемы при загрузке в json
            pattern = re.compile(r'"')
            geomData = re.sub(pattern, '\\"', geomData)

        xslt = etree.parse(os.path.dirname(os.path.abspath(__file__))+"/../../../resources/transaction/transactions.xsl")
        transform = etree.XSLT(xslt)

        result = transform(self.node,
                           datasource="'"+datasource.type+"'",
                           transactionType="'"+self.type+"'",
                           geometryAttribute="'"+datasource.geom_col+"'",
                           geometryData="'"+geomData+"'",
                           tableName="dummy",
                           tableId="'"+datasource.fid_col+"'")

        elements = result.xpath("//Statement")
        if len(elements) > 0:
            pattern = re.compile(r'\s+')
            self.setStatement(re.sub(pattern, ' ', elements[0].text))
            return
        self.setStatement(None)

