'''
Created on November 4, 2012
    
@author: michel
'''

from FeatureServer.Exceptions.BaseException import BaseException

class NoGeometryException(BaseException):
    
    message="Geometry could not be found."
    
    def __init__(self, locator, layer, code="", message="", dump = ""):
        if len(message) > 0:
            self.message = message
        BaseException.__init__(self, self.message, self.code, locator, layer, dump)