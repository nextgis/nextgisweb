from vectorformats.Feature import Feature
from vectorformats.Formats.Format import Format

try:
    from cjson import encode as json_dumps
    from cjson import decode as json_loads
except:
    try:
        from simplejson import dumps as json_dumps
        from simplejson import loads as json_loads
    except Exception, E:
        raise Exception("simplejson is required for using the GeoJSON service. (Import failed: %s)" % E)

class GeoJSON(Format):
    """
    The most complete Format in vectorformats library. This class is designed
    to use the fastest available JSON library to encode/decode to/from
    GeoJSON strings.
    """
    
    crs = None
    def _createFeature(self, feature_dict, id = None):
        """Private. Not designed to be used externally."""
        feature = Feature(id)
        if feature_dict.has_key('geometry'):
            feature.geometry = feature_dict['geometry']
        if feature_dict.has_key('properties'):
            feature.properties = feature_dict['properties']
        return feature 
        
    
    def encode(self, features, to_string=True, **kwargs):
        """
        Encode a list of features to a JSON object or string.

        to_string determines whethr it should convert the result to
        a string or leave it as an object to be encoded later
        """
        results = []
        result_data = None
        for feature in features:
            data = self.encode_feature(feature)
            for key,value in data['properties'].items():
                if value and isinstance(value, str): 
                    data['properties'][key] = unicode(value,"utf-8")
            results.append(data)
        
        result_data = {
                       'type':'FeatureCollection',
                       'features': results,
                       'crs': self.crs
                      }
        
        if to_string:
            result = json_dumps(result_data) 
        else:
            result = result_data
        return result
    
    def encode_feature(self, feature):
        return {'type':"Feature", 
            "id": feature.id, 
            "geometry": feature.geometry, 
            "properties": feature.properties}

    def encode_exception_report(self, exceptionReport):
        results = []
        data = {}
        
        for exception in exceptionReport:
            data = {
                "exceptionCode" : str(exception.code),
                "locator" : exception.locator,
                "layer" : exception.layer,
                "ExceptionText" : exception.message,
                "ExceptionDump" : exception.dump
            }
            results.append({"Exception" : data})
    
        return json_dumps({"ExceptionReport" : results})


    def decode(self, data):    
        feature_data = json_loads(data)
        if feature_data.has_key("features"):
            feature_data = feature_data['features']
        elif feature_data.has_key("members"):
            feature_data = feature_data['members']
        elif feature_data.has_key("type") and feature_data['type'] in ['Point', 'LineString', 'Polygon', 'MultiPolygon', 'MultiPoint', 'MultiLineString']:
            feature_data = [{'geometry':feature_data}] 
        else:
            feature_data = [feature_data]
        
        features = []
        for feature in feature_data:
            features.append(self._createFeature(feature))
        
        return features    
