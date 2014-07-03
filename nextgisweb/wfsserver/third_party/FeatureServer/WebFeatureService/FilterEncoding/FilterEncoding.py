'''
Created on Apr 5, 2011

@author: michel
'''

import os
import sys
from lxml import etree
from lxml import objectify

class FilterEncoding (object):
    
    xml = ""
    tree = None
    dom = None
    namespaces = {'gml' : 'http://www.opengis.net/gml'}

    
    def __init__(self, xml):
        self.parser = objectify.makeparser(remove_blank_text=True, ns_clean=True)
        xml = xml.replace('wildCard="*"', 'wildCard="\*"')
        xml = xml.replace('wildCard="?"', 'wildCard="\?"')
        xml = xml.replace('wildCard="."', 'wildCard="\."')

        xml = xml.replace('singleChar="*"', 'singleChar="\*"')
        xml = xml.replace('singleChar="?"', 'singleChar="\?"')
        xml = xml.replace('singleChar="."', 'singleChar="\."')
        
        xml = xml.replace('escapeChar="*"', 'escapeChar="\*"')
        xml = xml.replace('escapeChar="?"', 'escapeChar="\?"')
        xml = xml.replace('escapeChar="."', 'escapeChar="\."')
        
        
        #add global namespaces - duplicate namespaces will be removed by parser.
        nsFilter = '<Filter'
        for key, value in self.namespaces.iteritems():
            nsFilter += ' xmlns:' + key + '="' + value + '"'
        self.xml = xml.replace('<Filter', nsFilter)
        
        self.dom = etree.XML(self.xml, parser=self.parser)
    
    def parse(self, node = None, operator = None):
        if node == None:
            node = self.dom
        
        operator_class = None
        
        for child in node.iterchildren():
            if str(child.xpath('local-name()')) == 'ValueReference' or str(child.xpath('local-name()')) == 'PropertyName'  or str(child.xpath('local-name()')) == 'Literal' or str(child.xpath('local-name()')) == 'Envelope' or str(child.xpath('local-name()')) == 'lowerCorner' or str(child.xpath('local-name()')) == 'upperCorner':
                return
            
            operator_class = self.getFilterInstance(child)
            
            if operator != None:
                operator.appendChild(operator_class)
            
            if len(child) > 0:
                self.parse(node=child, operator=operator_class)
            
                    
        self.tree = operator_class
    
    def getFilterInstance(self, node):
        try:
            sys.path.append(os.path.dirname(os.path.abspath(__file__)))
            sys.path.append(os.path.dirname(os.path.abspath(__file__))+"/ComparisonOperators")
            sys.path.append(os.path.dirname(os.path.abspath(__file__))+"/LogicalOperators")
            sys.path.append(os.path.dirname(os.path.abspath(__file__))+"/ObjectIdentifiers")
            sys.path.append(os.path.dirname(os.path.abspath(__file__))+"/SpatialOperators")
            operator_module = __import__(str(node.xpath('local-name()')), globals(), locals())
        except ImportError:
            raise Exception("Could not find filter for %s" % node.xpath('local-name()'))
        
        operator_func = getattr(operator_module, node.xpath('local-name()'))
        return operator_func(node)

    def render(self, datasource, node = None):
        if node == None:
            node = self.tree
        
        self.create(datasource, node)
        return self.assemble(datasource=datasource, node=node)
            
    def assemble(self, datasource, node, sql = ''):
        
        #node.children.reverse()
        
        for child in node:
            sql += self.assemble(datasource, child, sql)
            
        # assemble statement
        if node.type == 'LogicalOperator':
            node.createStatement(datasource, node.children)
            sql = node.getStatement()
            return sql
        return node.getStatement()
    
    def create(self, datasource, node):
        for child in node:
            self.create(datasource, child)
        
        if node.type != 'LogicalOperator':
            node.createStatement(datasource)

    def getAttributes(self):
        from FilterAttributes import FilterAttributes
        filter = FilterAttributes(self.dom)
        return filter.render()

    def __str__(self):
        return etree.tostring(self.dom, pretty_print = True)
        