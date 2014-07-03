__author__  = "MetaCarta"
__copyright__ = "Copyright (c) 2006-2008 MetaCarta"
__license__ = "Clear BSD" 
__version__ = "$Id: OSM.py 491 2008-05-18 11:28:45Z crschmidt $"

from FeatureServer.Service.Request import Request
import vectorformats.Formats.OSM

class OSM(Request):
    def encode(self, result):
        osm = vectorformats.Formats.OSM.OSM()
        
        results = osm.encode(result)
        
        return ("application/xml", results, None, 'utf-8')
        