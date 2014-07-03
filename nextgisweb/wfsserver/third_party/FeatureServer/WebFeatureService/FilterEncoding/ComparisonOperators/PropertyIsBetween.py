'''
Created on Apr 5, 2011

@author: michel
'''

from FeatureServer.WebFeatureService.FilterEncoding.ComparisonOperators.ComparisonOperator import ComparisonOperator

class PropertyIsBetween(ComparisonOperator):
    def getLiteral(self):
        return ""
    def getLowerBoundary(self):
        return str(self.node.LowerBoundary.Literal)
    def getUpperBoundary(self):
        return str(self.node.UpperBoundary.Literal)
    