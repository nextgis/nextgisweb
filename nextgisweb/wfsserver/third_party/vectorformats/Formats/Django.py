import pickle
from vectorformats.Feature import Feature
from vectorformats.Formats.Format import Format

class Django(Format):
    """ This class is designed to decode a Django QuerySet object into
        Feature.Vector objects. 
        
        Simply pass a query_set to the decode method, and it will return
        a list of Features.

        Example Usage:
        
        >>> from vectorformats.Formats import Django, GeoJSON
        >>> qs = Model.objects.filter(city="Cambridge")
        >>> djf = Django.Django(geodjango="geometry", properties=['city', 'state'])
        >>> geoj = GeoJSON.GeoJSON()
        >>> string = geoj.encode(djf.decode(qs))
        >>> print string 
    """

    geodjango = False 
    """
    If you have GeoDjango geometry columns, set this to the name of the 
    geometry column. 
    """

    pickled_geometry = False
    """If you are not using GeoDjango, but have instead stored your geometry
       as pickled GeoJSON geometries in a column in GeoDjango, set 
       the pickled_geometry=True option in your class constructor. 
    """
    
    pickled_properties = False 
    """A column in the database representing a pickled set of attributes.
    This will be used in addition to any properties in the 'properties' list,
    with the list as a preference.
    """

    properties = []
    """
    List of properties you want copied from the model to the 
    output object.
    """

    def decode(self, query_set, generator = False):
        results = []
        for res in query_set:
            feature = Feature(res.pk)
            
            if self.pickled_geometry:
                feature.geometry = pickle.loads(res.geometry)
            
            elif self.geodjango:
                geometry = None
                geom = getattr(res, self.geodjango)
                if geom:
                    geometry = {}
                    geometry['type'] = geom.geom_type
                    geometry['coordinates'] = geom.coords
                feature.geometry = geometry

            if self.pickled_properties:
                props = getattr(res, self.pickled_properties) 
                feature.properties = pickle.loads(props.encode("utf-8"))
            
            if self.properties:   
                for p in self.properties:
                    feature.properties[p] = getattr(res, p)
            results.append(feature) 
        return results    
