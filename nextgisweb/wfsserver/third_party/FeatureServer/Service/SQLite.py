'''
Created on Sep 14, 2012

@author: michel
'''
from FeatureServer.Service.Request import Request
import StringIO
import os
import tempfile
import vectorformats.Formats.SQLite

class SQLite(Request):
    def encode(self, result):
        sqlite = vectorformats.Formats.SQLite.SQLite(layername=self.datasources[0], datasource=self.service.datasources[self.datasources[0]])
        
        try:
            fd, temp_path = tempfile.mkstemp()
            os.close(fd)
            
            connection = sqlite.encode(result, tmpFile=temp_path)
        
            output = StringIO.StringIO(open(temp_path).read())
        finally:
            os.remove(temp_path)
            
        
        headers = {
            'Accept': '*/*',
            'Content-Disposition' : 'attachment; filename=poidownload.sqlite3',
            'Content-Transfer-Encoding' : 'binary'
        }
        
        return ("application//octet-stream;", output, headers, '')