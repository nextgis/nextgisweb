from FeatureServer.DataSource import DataSource
from FeatureServer.Service import Action 

from vectorformats.Feature import Feature
from vectorformats.Formats.WKT import to_wkt, from_wkt

from google.appengine.ext import db

geohash_support = False

try:
    from geohash import Geoindex
    geohash_support = True
except:
    pass

class FSModel(db.Expando):
    """Simple expando model for storing features."""
    geometry = db.TextProperty()
    geohash = db.StringProperty()

class AppEngine(DataSource):
    """Start on an AppEngine DataSource. No geographic search allowed.""" 
    
    query_action_types = ['lt', 'gt', 'gte', 'lte']
    
    query_action_string = {'lt': '<', 'gt': '>', 'gte': '>=', 'lte': '<='}

    def __init__(self, name, model = None, **args):
        DataSource.__init__(self, name, **args)
        self.model = model
        if self.model == None:
            self.model = FSModel
    
    def insert(self, action):
        props = {}
        for key, value in action.feature.properties.items():
            props[str(key)] = value
        obj = self.model(**props)
        obj.geometry = to_wkt(action.feature.geometry)
        if geohash_support:
            bbox = action.feature.get_bbox()
            union = Geoindex(bbox[0:2]) + Geoindex(bbox[2:])
            obj.geohash = str(union) 
        obj.save()
        action.id = int(obj.key().id())
        return self.select(action)
    
    def update(self, action):
        obj = self.model.get_by_id(int(action.id))
        obj.geometry = to_wkt(action.feature.geometry)
        for key, value in action.feature.properties.items():
            setattr(obj, str(key), value)
        if geohash_support:
            bbox = action.feature.get_bbox()
            union = Geoindex(bbox[0:2]) + Geoindex(bbox[2:])
            obj.geohash = str(union) 
        obj.save()
        action.id = int(obj.key().id())
        return self.select(action)

    def delete(self, action):
        obj = self.model.get_by_id(int(action.id))
        obj.delete()
        return []
    
    def select(self, action):
        obj_list = []    
        if action.id:
            obj = self.model.get_by_id(action.id)
            if obj:
                obj_list = [obj]
        else:
            obj_list = self.model.all()
            if action.bbox:
                if geohash_support:
                    bbox = action.bbox
                    hash1 = Geoindex(bbox[0:2])
                    hash2 = Geoindex(bbox[2:])
                    obj_list = obj_list.filter("geohash <=", str(hash2)).filter("geohash >=", str(hash1))
                else:
                    raise Exception("No GeoHash support -> No bbox support.")
                    
            if action.attributes:
                current_key = None
                for key, value in action.attributes.items():
                    if isinstance(value, dict):
                        obj_list.filter("%s %s" % (value['column'], self.query_action_string[value['type']]), value['value'])
                    else:
                        obj_list.filter("%s =" % key, value)
        return_list = []
        for obj in obj_list:    
            props = {}
            for key in obj.dynamic_properties():
                props[key] = getattr(obj, key)
            return_list.append(Feature(id=obj.key().id(), geometry=from_wkt(obj.geometry), srs=self.srid_out, props=props))
        return return_list    
