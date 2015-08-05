'''
'''

from ....FeatureServer.WebFeatureService.Response.ActionResult import ActionResult


class ReplaceResult(ActionResult):

    def __init__(self, resource, handle):
        ActionResult.__init__(self, resource, handle)
        self.type = 'replace'
