__author__  = "MetaCarta"
__copyright__ = "Copyright (c) 2006-2008 MetaCarta"
__license__ = "Clear BSD" 
__version__ = "$Id: KML.py 556 2008-05-21 16:32:45Z crschmidt $"

from FeatureServer.Service.Request import Request
import vectorformats.Formats.KML

class KML(Request):
    mime_type = "application/vnd.google-earth.kml+xml"

    def encode(self, result):
        kml = vectorformats.Formats.KML.KML(url=self.host, layername=self.datasources[0]) 
        results = kml.encode(result)
        return ("application/vnd.google-earth.kml+xml", results, None, 'utf-8')        
    
    def parse(self, params, path_info, host, post_data, request_method):
        self.get_layer(path_info, params)

        kml = vectorformats.Formats.KML.KML(url=self.host, layername=self.datasources[0])
        Request.parse(self, params, path_info, host, post_data, request_method, format_obj=kml) 
    
    def encode_metadata(self, action):
        results = ["""<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://earth.google.com/kml/2.0" xmlns:fs="http://featureserver.com/ns" xmlns:atom="http://www.w3.org/2005/Atom">
<Folder>
<atom:link rel="self" href="%s" type="application/vnd.google-earth.kml+xml" />""" % self.host]

        layers = self.service.datasources
        for key in layers.keys():
            results.append("""<NetworkLink>
        <name>%s</name>
        <open>0</open>
        <Url>
                <href>%s/%s/all.kml?maxfeatures=50</href>
                <viewRefreshMode>onStop</viewRefreshMode>
                <viewRefreshTime>1</viewRefreshTime>
        </Url>
</NetworkLink>""" % (key, self.host, key))
        results.append("</Folder></kml>")     
        
        return (self.mime_type, "\n".join(results), {'Content-Disposition': "attachment; filename=featureserver_networklink.kml"})
