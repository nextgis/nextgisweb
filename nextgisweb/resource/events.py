class AfterResourcePut:
    def __init__(self, resource, request):
        self.resource = resource
        self.request = request

    def __repr__(self):
        return self.__class__.__name__


class AfterResourceCollectionPost:
    def __init__(self, resource, request):
        self.resource = resource
        self.request = request

    def __repr__(self):
        return self.__class__.__name__
