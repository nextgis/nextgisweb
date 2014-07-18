'''
Created on October 15, 2012
    
@author: michel
'''


class BaseException(Exception):
    dump = ""
    code = ""
    locator = ""
    layer = ""

    def __init__(self, message, code, locator, layer, dump):
        Exception.__init__(self, message)
        self.code = code
        self.locator = locator
        self.layer = layer
        self.dump = dump
        