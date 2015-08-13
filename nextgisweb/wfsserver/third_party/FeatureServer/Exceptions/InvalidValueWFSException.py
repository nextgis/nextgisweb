from ...FeatureServer.Exceptions.BaseException import BaseException



class InvalidValueWFSException(BaseException):

    message = "Invalid Value"

    def __init__(self, code="", locator='', layer='', message="", dump=""):
        self.message = self.message
        if len(message) > 0:
            self.message = message
            BaseException.__init__(
                self, self.message, self.code, locator, layer, dump)
