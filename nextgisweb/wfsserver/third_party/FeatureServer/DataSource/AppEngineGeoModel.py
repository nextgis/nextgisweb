# Based on using GeoModel / GeoCell for storing locations (Point only!) 
# in appengine.  Has advantage over geohash idea because it doesn't require
# an inequality query, so you can use that on something else.

# requires all the geomodel files: util.py, geocell.py, geomath.py, geomodel.py
# from http://geomodel.googlecode.com/svn/trunk/geo/ - these should be under /geo


from FeatureServer.DataSource import DataSource
from FeatureServer.Service import Action 

from vectorformats.Feature import Feature
from vectorformats.Formats.WKT import to_wkt, from_wkt

from google.appengine.ext import db

from geo.geomodel import GeoModel
import geo.geotypes

import logging

class FSModel(GeoModel):
    """Simple model for storing features."""
    geometry = db.TextProperty()
    #put whatever other stuff you want here, and/or set GeoModel to subclass
    #from db.Expando and upload arbitrary attribs
    foo = db.TextProperty()
    

class AppEngineGeoModel(DataSource):
    """
    Uses GeoCell / GeoModel for location indexing
    """ 
    
    query_action_types = ['lt', 'gt', 'gte', 'lte', 'ne']
    query_action_string = {'lt': '<', 'gt': '>', 'gte': '>=', 'lte': '<=', 'ne' : '!='}

    def __init__(self, name, model = None, **args):
        DataSource.__init__(self, name, **args)
        self.model = model
        if self.model == None:
            self.model = FSModel

        self.excluded_fields = ['geometry','location']
        self.excluded_fields.extend(['location_geocell_' + str(x) for x in range(1,14)])
 
    def get_keyname(self, id):
        return 'kn_' + str(id)
    
    def insert(self, action):
        props = {}
        coords = action.feature.geometry['coordinates']
        for key, value in action.feature.properties.items():
            props[str(key)] = value
        props['location'] = db.GeoPt(coords[1],coords[0])
        obj = self.model(**props)
        obj.geometry = to_wkt(action.feature.geometry)
        try:
            obj.update_location()
        except:
            raise Exception(str([props['location'],obj.location]))
        try: obj.save()
        except: obj.save()
        if not action.id: 
            action.id = obj.key().id()
        return self.select(action)
    
    def update(self, action):
        #obj = self.model.get_by_id(int(action.id))
        kn = self.get_keyname(action.id)
        obj = self.model.get_by_key_name(kn)
        obj.geometry = to_wkt(action.feature.geometry)

        for key, value in action.feature.properties.items():
            setattr(obj, str(key), value)
        obj.update_location()
        try: obj.save()
        except: obj.save()
        #action.id = obj.key().id()
        return self.select(action)

    def delete(self, action):
        #obj = self.model.get_by_id(int(action.id))
        kn = self.get_keyname(action.id)
        obj = self.model.get_by_key_name(kn)
        obj.delete()
        return []
    
    def select(self, action):
        obj_list = []    
        max_features = action.maxfeatures or 1000
        if action.id:
            obj = self.model.get_by_id(action.id)
            if obj:
                obj_list = [obj]
        else:
            obj_list = self.model.all()
            if action.attributes:
                current_key = None
                for key, value in action.attributes.items():
                    if isinstance(value, dict):
                        obj_list = obj_list.filter("%s %s" % (value['column'], self.query_action_string[value['type']]), value['value'])
                    else:
                        try: value = int(value)
                        except: pass
                        obj_list = obj_list.filter("%s =" % key, value)
                        
                        
            if action.bbox: 
                #geocell likes N,E,S,W bbox with 
                W,S,E,N = action.bbox
                #also needs to be valid wgs84 coords
                W = max(W, -180)
                E = min(E, 180)
                S = max(S, -90)
                N = min(N, 90)
                obj_list = self.model.bounding_box_fetch(
                    obj_list, 
                    geotypes.Box(N,E,S,W),
                    max_results=max_features)
                    
        return_list = []
        for obj in obj_list[:max_features]:
            props = {}
            #get attribs for model
            for key in self.model.fields():
                if not key in self.excluded_fields:
                    try: props[key] = getattr(obj, key)
                    except: props[key] = None
            #get additional attribs for expando stuff
            for key in obj.dynamic_properties():
                    try: props[key] = getattr(obj, key)
                    except: props[key] = None
            try: geom = from_wkt(obj.geometry)
            except: 
                logging.error('fail on obj %s' % key)
                continue
            return_list.append(Feature(id=action.id, geometry=from_wkt(obj.geometry), srs=self.srid_out, props=props))
        return return_list    
