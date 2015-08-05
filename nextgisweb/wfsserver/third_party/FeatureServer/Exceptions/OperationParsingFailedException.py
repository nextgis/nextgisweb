from ...FeatureServer.Exceptions.BaseException import BaseException


class OperationParsingFailedException(BaseException):

    message = "Can't parse the request"

    def __init__(self, code="", locator='', layer='', message="", dump=""):
        self.message = self.message
        if len(message) > 0:
            self.message = message
            BaseException.__init__(
                self, self.message, self.code, locator, layer, dump)
