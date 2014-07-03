__author__  = "MetaCarta"
__copyright__ = "Copyright (c) 2006-2008 MetaCarta"
__license__ = "Clear BSD" 
__version__ = "$Id: OSM.py 599 2009-04-02 21:35:26Z crschmidt $"

from vectorformats.Formats.Format import Format

class OSM(Format):
    """OSM 0.5 writing."""

    def encode(self, result):
        results = ["""<?xml version="1.0" encoding="UTF-8"?>
<osm version="0.5" generator="FeatureServer">"""]
        
        for action in result:
                results.append( self.encode_feature(action))
        results.append("</osm>")
        return "\n".join(results)
    
    def encode_feature(self, feature):
        import xml.dom.minidom as m
        import types
        doc = m.Document()
        
        if feature.geometry['type'] == "Point":
            version = None
            if feature.properties.has_key('version'):
                version = feature.properties['version']
            node = self.create_node(-feature.id, feature.geometry['coordinates'], version)
            for key, value in feature.properties.items():
                if isinstance(value, types.NoneType):
                    continue
                if isinstance(value, str):
                    value = unicode(value, "utf-8")
                if isinstance(value, int):
                    value = str(value)
                tag = doc.createElement("tag")
                tag.setAttribute("k", key)
                tag.setAttribute("v", value)
                node.appendChild(tag)
            return node.toxml()
        
        elif feature.geometry['type'] == "Line" or feature.geometry['type'] == "LineString" or feature.geometry['type'] == "Polygon":
            xml = ""
            i = 0
            way = doc.createElement("way")
            way.setAttribute("id", str(-feature.id))
            coords = None
            if feature.geometry['type'] == "Line" or feature.geometry['type'] == "LineString":
                coords = feature.geometry['coordinates']
            else:    
                coords = feature.geometry['coordinates'][0]
            for coord in coords:
                i+=1
                version = None
                if feature.properties.has_key('version'):
                    version = feature.properties['version']
                xml += self.create_node("-%s000000%s" % (feature.id, i), coord, version).toxml()
                nd = doc.createElement("nd")
                nd.setAttribute("ref", "-%s000000%s" % (feature.id, i))
                way.appendChild(nd)
            for key, value in feature.properties.items():
                if isinstance(value, types.NoneType):
                    continue
                if isinstance(value, str):
                    value = unicode(value, "utf-8")
                if isinstance(value, int):
                    value = str(value)
                tag = doc.createElement("tag")
                tag.setAttribute("k", key)
                tag.setAttribute("v", value)
                way.appendChild(tag)
            xml += way.toxml()
            return xml    
        return ""
        
        
    def create_node(self, id, geom, version):
        import xml.dom.minidom as m
        doc = m.Document()
        node = doc.createElement("node")
        node.setAttribute("id", str(id)) 
        node.setAttribute("lat", "%s" % geom[1])
        node.setAttribute("lon", "%s" % geom[0])
        if version is None:
            node.setAttribute("version", "0")
        else:
            node.setAttribute("version", "%s" % version)
        return node
