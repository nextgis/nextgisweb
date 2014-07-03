'''
Created on Oct 16, 2011

@author: michel
'''
import os, re
from FeatureServer.WebFeatureService.Transaction.TransactionAction import TransactionAction
from lxml import etree

class Insert(TransactionAction):
    
    def __init__(self, node):
        super(Insert, self).__init__(node)
        self.type = 'insert'
        
    
    def createStatement(self, datasource):
        self.removeAdditionalColumns(datasource)
        
        geom = self.node.xpath("//*[local-name() = '"+datasource.geom_col+"']/*")
        geomData = etree.tostring(geom[0], pretty_print=True)
        xslt = etree.parse(os.path.dirname(os.path.abspath(__file__))+"/../../../resources/transaction/transactions.xsl")
        transform = etree.XSLT(xslt)
        
        result = transform(self.node,
                           datasource="'"+datasource.type+"'",
                           transactionType="'"+self.type+"'",
                           geometryAttribute="'"+datasource.geom_col+"'",
                           geometryData="'"+geomData+"'",
                           tableName="'"+datasource.layer+"'")
        elements = result.xpath("//Statement")
        if len(elements) > 0:
            pattern = re.compile(r'\s+')
            self.setStatement(re.sub(pattern, ' ', str(elements[0])))
            return
        self.setStatement(None)
        
        