'''
Created on October 10, 2012
    
@author: michel
'''

from FeatureServer.Exceptions.BaseException import BaseException

class MissingParameterException(BaseException):
    
    argument=""
    message="Argument '%s' is missing in layer '%s'."
    
    def __init__(self, locator, layer, argument, code="", message="", dump = ""):
        self.argument = argument
        self.message = self.message % (self.argument, layer)
        if len(message) > 0:
            self.message = message
        BaseException.__init__(self, self.message, self.code, locator, layer, dump)
