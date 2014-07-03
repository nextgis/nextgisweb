'''
Created on Apr 5, 2011

@author: michel
'''

from FeatureServer.WebFeatureService.FilterEncoding.ComparisonOperators.ComparisonOperator import ComparisonOperator

class PropertyIsNull(ComparisonOperator):
    ''' '''
    def getPropertyName(self): return str(self.node.PropertyName)
        