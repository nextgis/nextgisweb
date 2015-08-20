from ...FeatureServer.Exceptions.BaseException import BaseException


class OperationProcessingFailedException(BaseException):

    message = "Unexpected error occurs during the request processing"

    def __init__(self, code="", locator='', layer='', message="", dump=""):
        self.message = self.message
        if len(message) > 0:
            self.message = message
            BaseException.__init__(
                self, self.message, self.code, locator, layer, dump)
