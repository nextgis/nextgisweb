'''
Created on Jul 30, 2011

@author: michel
'''

from vectorformats.Formats.Format import Format
import StringIO
from struct import pack
import types

class OV2(Format):
    
    def encode(self, features, **kwargs):
        ov2Buffer = StringIO.StringIO()
        
        for feature in features:
            self.encode_feature(feature, ov2Buffer)
        
        return ov2Buffer
        
    def encode_feature(self, feature, buffer):
        if feature.properties.has_key('name'):
            if isinstance(feature.properties['name'], types.NoneType):
                buffer.write(self.getBinaryLine(str(feature.id), feature.geometry["coordinates"][0], feature.geometry["coordinates"][1]))
            else:
                buffer.write(self.getBinaryLine(feature.properties['name'].encode('utf-8'), feature.geometry["coordinates"][0], feature.geometry["coordinates"][1]))
        else:
            buffer.write(self.getBinaryLine(str(feature.id), feature.geometry["coordinates"][0], feature.geometry["coordinates"][1]))
            
        
    def getBinaryLine(self, name, lat, lon):
        return chr(0x02) + pack("I", len(bytes(name))+14) + pack("I", int(round(lat*100000))) + pack("I", int(round(lon*100000))) + bytes(name) + chr(0x00)
    
    