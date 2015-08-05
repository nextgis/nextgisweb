'''
Created on October 15, 2012

@author: michel
'''

from ...FeatureServer.Exceptions.BaseException import BaseException


class NoLayerException(BaseException):

    message = "No Layer is configured."

    def __init__(self, locator, layer="", code="", message="", dump=""):
        if len(message) > 0:
            self.message = message
        BaseException.__init__(
            self, self.message, self.code, locator, layer, dump)
