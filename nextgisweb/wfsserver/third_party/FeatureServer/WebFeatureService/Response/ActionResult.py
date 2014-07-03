'''
Created on Oct 21, 2011

@author: michel
'''

class ActionResult(object):
    
    def __init__(self, resource, handle):
        self.resource = resource
        self.handle = handle
    
    def getResourceId(self):
        return self.resource
    
    def getHandle(self):
        return self.handle
    