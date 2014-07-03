'''
Created on Nov 3, 2012
    
@author: michel
'''

import os
from lxml import etree

class FilterAttributes(object):
    
    node = None
    
    def __init__(self, node):
        self.node = node
    
    def render(self):
        xslt = etree.parse(os.path.dirname(os.path.abspath(__file__))+"/../../../resources/filterencoding/filter_attributes.xsl")
        transform = etree.XSLT(xslt)
        result = transform(self.node)
        
        elements = result.xpath("//Attributes")
        if len(elements) > 0:
            str_list =  elements[0].text.strip().split(',')
            str_list = filter(None, str_list)
            str_list = filter(lambda x: len(x) > 0, str_list)
            return str_list
        return []

