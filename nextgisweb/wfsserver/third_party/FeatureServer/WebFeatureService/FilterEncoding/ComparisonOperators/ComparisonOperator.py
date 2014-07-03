'''
Created on Apr 5, 2011

@author: michel
'''
import os
from lxml import etree
from FeatureServer.WebFeatureService.FilterEncoding.Operator import Operator

class ComparisonOperator(Operator):
    def __init__(self, node):
        super(ComparisonOperator, self).__init__(node)
        self.type = 'ComparisonOperator'
    
    def getValueReference(self): return str(self.node.ValueReference)
    def getPropertyName(self): return str(self.node.PropertyName)
    def getLiteral(self): return str(self.node.Literal)
    def createStatement(self, datasource):
        xslt = etree.parse(os.path.dirname(os.path.abspath(__file__))+"/../../../../resources/filterencoding/comparison_operators.xsl")
        transform = etree.XSLT(xslt)
        
        if hasattr(datasource, 'hstore'):
            result = transform(self.node, datasource="'"+datasource.type+"'", operationType="'"+str(self.node.xpath('local-name()'))+"'", hstore="'"+str(datasource.hstore).lower()+"'", hstoreAttribute="'"+datasource.hstoreAttribute+"'")
        else:
            result = transform(self.node, datasource="'"+datasource.type+"'", operationType="'"+str(self.node.xpath('local-name()'))+"'")

        elements = result.xpath("//Statement")
        if len(elements) > 0:
            self.setStatement(str(elements[0]))
            return
        self.setStatement(None)
    