'''
Created on May 24, 2011

@author: michel
'''

from ....FeatureServer.Exceptions.BaseException import BaseException


class WFSException(BaseException):

    def __init__(self, locator, layer, message, code="", dump=""):
        BaseException.__init__(self, message, code, locator, layer, dump)
