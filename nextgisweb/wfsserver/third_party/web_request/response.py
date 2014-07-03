import StringIO

class Response(object): 
    status_code = 200
    extra_headers = None
    content_type = "text/plain"
    data = ""
    encoding = 'utf-8'
    def __init__(self, data="", content_type=None, headers = None, status_code=None, encoding='utf-8'):
        self.data = data
        self.content_type = content_type
        self.extra_headers = headers
        self.status_code = status_code
        self.encoding = encoding
    
    def getData(self):
        if isinstance(self.data, StringIO.StringIO):
            return self.data.getvalue()
        if len(self.encoding) > 0:
            return self.data.encode(self.encoding)
        else:
            return str(self.data)