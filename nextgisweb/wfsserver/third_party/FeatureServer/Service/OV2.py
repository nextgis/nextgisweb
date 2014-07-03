'''
Created on Jul 30, 2011

@author: michel
'''

from FeatureServer.Service.Request import Request
import vectorformats.Formats.OV2

class OV2(Request):
    def encode(self, results):
        ov2 = vectorformats.Formats.OV2.OV2(layername=self.datasources[0])
        
        output = ov2.encode(results)

        headers = {
            'Accept': '*/*',
            'Content-Disposition' : 'attachment; filename=poidownload.ov2',
            'Content-Transfer-Encoding' : 'binary'
        }
        
        return ("application/octet-stream", output, headers, '')
        