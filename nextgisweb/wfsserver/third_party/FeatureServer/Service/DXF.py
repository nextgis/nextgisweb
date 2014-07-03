'''
@author: Michel Ott
'''
from FeatureServer.Service.Request import Request
import StringIO
import os
import tempfile
import vectorformats.Formats.DXF

class DXF(Request):
    def encode(self, result):
        dxf = vectorformats.Formats.DXF.DXF(layername=self.datasources[0], datasource=self.service.datasources[self.datasources[0]])
        
        try:
            fd, temp_path = tempfile.mkstemp()
            os.close(fd)
            
            drawing = dxf.encode(result, tmpFile=temp_path)
            
            output = StringIO.StringIO(open(temp_path).read())
        finally:
            os.remove(temp_path)
        
        
        headers = {
            'Accept': '*/*',
            'Content-Disposition' : 'attachment; filename=poidownload.dxf',
            'Content-Transfer-Encoding' : 'binary'
        }
        
        return ("application//octet-stream;", output, headers, '')