'''
Created on Oct 16, 2011

@author: michel
'''
import re

class TransactionAction(object):

    def __init__(self, node):
        self.children = []
        self.index = 0
        self.stmt = None
        self.type = ''
        self.node = node
        

    def setStatement(self, stmt):
        self.stmt = stmt
    
    def getStatement(self, datasource = None):
        if self.stmt == None and datasource != None:
            self.createStatement(datasource)
        return self.stmt
    
    def createStatement(self, datasource): pass
    
    def __len__(self):
        return len(self.children)

    def __iter__(self):
        self.index = 0
        return self
    
    def next(self):
        if self.index >= len(self):
            raise StopIteration
        child = self.children[self.index]
        self.index += 1
        return child
        
    def get(self, index):
        return self.children[index]
    
    def hasChildren(self):
        if len(self) > 0:
            return True

    def getChildren(self):
        return self.children
    
    def appendChild(self, node):
        self.children.append(node)
        
    def getName(self):
        return str(self.node.tag)
    
    def removeAdditionalColumns(self, datasource):
        #filter out additional cols (they can not be saved)
        if hasattr(datasource, "additional_cols"):
            for additional_col in datasource.additional_cols.split(';'):            
                name = additional_col
                matches = re.search('(?<=[ ]as[ ])\s*\w+', str(additional_col))
                if matches:
                    name = matches.group(0)
                
                nodes = self.node.xpath("//*[local-name()='"+name+"']")
                if len(nodes) > 0:
                    for node in nodes:
                        self.node.remove(node)

