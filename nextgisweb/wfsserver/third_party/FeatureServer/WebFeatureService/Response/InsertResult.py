'''
'''

from ....FeatureServer.WebFeatureService.Response.ActionResult import ActionResult


class InsertResult(ActionResult):

    def __init__(self, resource, handle, layer_id):
        ActionResult.__init__(self, resource, handle, layer_id)
        self.type = 'insert'
