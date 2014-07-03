'''
Created on Jul 30, 2011

@author: michel
'''

from FeatureServer.Service.Request import Request
import vectorformats.Formats.GPX

class GPX(Request):
    def encode(self, results):
        gpx = vectorformats.Formats.GPX.GPX(layername=self.datasources[0])
        
        output = gpx.encode(results)
        return ("application/xml", output, None, 'utf-8')
        