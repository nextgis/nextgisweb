'''
Created on May 24, 2011

@author: michel
'''
from ....FeatureServer.Exceptions.WebFeatureService.WFSException import WFSException


class InvalidValueException(WFSException):

    def __init__(self, **kwargs):
        super(InvalidValueException, self).__init__(
            code="InvalidParameterValue", message="ValueReference does not exist.", **kwargs)
