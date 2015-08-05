'''
'''

from ....FeatureServer.WebFeatureService.Response.ActionResult import ActionResult


class UpdateResult(ActionResult):

    def __init__(self, resource, handle):
        ActionResult.__init__(self, resource, handle)
        self.type = 'update'
