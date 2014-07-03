'''
Created on Oct 16, 2011

@author: michel
'''
import os
from FeatureServer.WebFeatureService.Transaction.TransactionAction import TransactionAction
from lxml import etree
import re

class Delete(TransactionAction):
    
    def __init__(self, node):
        super(Delete, self).__init__(node)
        self.type = 'delete'
        
    def createStatement(self, datasource):
        xslt = etree.parse(os.path.dirname(os.path.abspath(__file__))+"/../../../resources/transaction/transactions.xsl")
        transform = etree.XSLT(xslt)
        
        result = transform(self.node,
                           datasource="'"+datasource.type+"'",
                           transactionType="'"+self.type+"'",
                           tableName="'"+datasource.layer+"'",
                           tableId="'"+datasource.fid_col+"'")
        elements = result.xpath("//Statement")
        if len(elements) > 0:
            pattern = re.compile(r'\s+')
            self.setStatement(re.sub(pattern, ' ', str(elements[0])))
            return
        self.setStatement(None)
        
        