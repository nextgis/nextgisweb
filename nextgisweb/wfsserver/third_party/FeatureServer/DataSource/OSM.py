__author__  = "MetaCarta"
__copyright__ = "Copyright (c) 2006-2008 MetaCarta"
__license__ = "Clear BSD" 
__version__ = "$Id: Twitter.py 412 2008-01-01 08:15:59Z crschmidt $"

from FeatureServer.DataSource import DataSource
from vectorformats.Feature import Feature

import urllib
import xml.dom.minidom

class OSM (DataSource):
    """Specialized datasource allowing read-only access to OpenStreetMap"""
    
    osmxapi_url = "http://www.informationfreeway.org/api/0.5/"    
    
    def __init__(self, name, osmxapi="false", uninteresting_tags = "attribution,created_by", **args):
        DataSource.__init__(self, name, **args)
        self.uninteresting_tags = uninteresting_tags.split(",")
        self.osmxapi = osmxapi.lower() in ("true", "1", "yes") 
        
    def select (self, action):
        """Load data from one of the OpenStreetMap APIs using urllib.""" 
        if self.osmxapi:
            data = self.select_osmxapi(action)
        else:
            data = self.select_main(action)
        
        doc = xml.dom.minidom.parseString(data)
        nodes = {}
        features = []
        for node in doc.getElementsByTagName("node"):
            properties = {}
            interesting = False
            for tag in node.getElementsByTagName("tag"):
                key = tag.getAttribute("k")
                properties[key] = tag.getAttribute("v")
                if not key in self.uninteresting_tags:
                    interesting = True
                    
            id = int(node.getAttribute("id"))
            nodes[id] = [float(node.getAttribute("lon")), float(node.getAttribute("lat"))]
            if interesting == True:
                geom = {'type':'Point', 'coordinates':nodes[id]}
                features.append(Feature(id=id, geometry=geom, srs=self.srid_out, props=properties))
        
        for way in doc.getElementsByTagName("way"):
            geometry = {'type':'LineString', 'coordinates':[]}
            for nd in way.getElementsByTagName('nd'):
                geometry['coordinates'].append(nodes[int(nd.getAttribute("ref"))])
            properties = {}
            
            for tag in way.getElementsByTagName("tag"):
                key = tag.getAttribute("k")
                properties[key] = tag.getAttribute("v")
            
            features.append(Feature(id=int(way.getAttribute("id")), geometry=geometry, srs=self.srid_out, props=properties))
        
        return features
    
    def select_osmxapi(self, action):
        """Talking to osmxapi, either with an attribute or bbox query (or both)."""
        if action.id:
            return self.select_main(action)
        else:
            predicates = []
            for key, value in action.attributes.items():
                predicates.append("[%s=%s]" % (key, value))
            if action.bbox:
                predicates.append("[bbox=%s]" % ",".join(map(str, action.bbox)))
            
            url = "%sway%s" % (self.osmxapi_url, "".join(predicates))
            return urllib.urlopen(url).read()
            
    def select_main(self, action):
        """Talking to the main API, openstreetmap.org."""
        if action.id:
            urldata = urllib.urlopen("http://openstreetmap.org/api/0.5/way/%s/full" % action.id)
        elif action.bbox: 
            urldata = urllib.urlopen("http://openstreetmap.org/api/0.5/map?bbox=%s" % ",".join(map(str, action.bbox)))
        else:
            raise Exception("Only bounding box queries or queries for way-by-ID are acceptable.")
        data = urldata.read()    
        if len(data) == 1:
            raise Exception("OSM Server Error: %s" % urldata.info().get('error'))
        return data
