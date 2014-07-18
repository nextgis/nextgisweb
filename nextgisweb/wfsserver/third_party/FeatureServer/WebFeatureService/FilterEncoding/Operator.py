'''
Created on Apr 5, 2011

@author: michel
'''


class Operator(object):
    namespaces = {'ofs' : 'http://www.someserver.com/myns'}
    children = None
    index = 0
    type = ''
    stmt = None
    node = None
    
    def __init__(self, node):
        self.node = node
        self.children = []
        self.type = ''
        self.stmt = None
    
    def getStatement(self, datasource = None):
        if self.stmt == None and datasource != None:
            self.createStatement(datasource)
        return self.stmt
    
    def setStatement(self, stmt):
        self.stmt = stmt
        
    def createStatement(self, datasource): pass
    
    def appendChild(self, node):
        self.children.append(node)
    
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
       
    def getName(self):
        return str(self.node.tag)
    