'''
Created on Oct 21, 2011

@author: michel
'''


class ActionResult(object):

    def __init__(self, resource, handle, layer_id=None):
        self.resource = resource
        self.handle = handle
        self.layer_id = layer_id

    def getResourceId(self):
        return self.resource

    def getHandle(self):
        return self.handle

    def getLayerId(self):
        return self.layer_id