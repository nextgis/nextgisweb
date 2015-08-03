'''
'''

from ....FeatureServer.WebFeatureService.Response.ActionResult import ActionResult


class InsertResult(ActionResult):

    def __init__(self, resource, handle):
        ActionResult.__init__(self, resource, handle)
        self.type = 'insert'
