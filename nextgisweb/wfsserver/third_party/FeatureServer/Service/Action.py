class Action (object):

    """Encodes information about the request -- each property may be parsed out
        of the request and then passed into a datasource for action. the 'method'
        property should be one of select, insert, update, delete or metadata."""

    def __init__(self):
        self.method = None
        self.layer = None
        self.feature = None
        self.id = None
        self.bbox = None
        self.maxfeatures = None
        self.startfeature = 0
        self.outputformat = None
        self.srsname = None
        self.attributes = {}
        self.metadata = None
        self.wfsrequest = None
        self.version = ''
        self.request = None
        self.handle = ''
