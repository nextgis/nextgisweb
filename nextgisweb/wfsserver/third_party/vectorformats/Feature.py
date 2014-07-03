class Feature (object):
    """
    >>> f = Feature(1, {"type":"Point", "coordinates": [1.0,0.0]})
    >>> point = f.__geo_interface__
    >>> point
    {'type': 'Point', 'coordinates': [1.0, 0.0]}

    >>> f.__geo_interface__['coordinates'][0] = 2.0 
    >>> f.__geo_interface__
    {'type': 'Point', 'coordinates': [2.0, 0.0]}
    """
    
    def __init__ (self, id = None, geometry = None, geometry_attr=None, srs=None, props = None):
        self.id             = id
        self.geometry       = geometry 
        self.properties     = props or {}
        self.bbox           = None
        self.geometry_attr  = geometry_attr
        self.srs            = srs
    
    def get_geo(self):
        return self.geometry
    
    def set_geo(self, geom):
        self.geometry = geom
    
    __geo_interface__ = property(get_geo, set_geo)

    def __getitem__(self, key):
        if key == "geometry":
            return self.geometry
        elif key == "properties":
            return self.properties
        elif key == "id":
            return self.id
        elif key == "geometry_attr":
            return self.geometry_attr
        elif key == "srs":
            return self.srs
        raise KeyError(key)    
    
    def __setitem__(self, key, value):
        if key == "geometry":
            self.geometry = value
        elif key == "properties":
            self.properties = value
        elif key == "id":
            self.id = value
        elif key == "geometry_attr":
            self.geometry_attr = value
        elif key == "srs":
            self.srs = value
        else:
            raise KeyError(key)
        return     
    
    def get_bbox (self):
        minx = miny = 2**31
        maxx = maxy = -2**31
        try:
            
            coords = self.geometry["coordinates"]
            
            if self.geometry["type"] == "Point":
                minx = coords[0]
                maxx = coords[0]
                miny = coords[1]
                maxy = coords[1]
            
            elif self.geometry["type"] == "LineString":
                for coord in coords:
                    if coord[0] < minx: minx = coord[0]
                    if coord[0] > maxx: maxx = coord[0]
                    if coord[1] < miny: miny = coord[1]
                    if coord[1] > maxy: maxy = coord[1]
            
            elif self.geometry["type"] == "Polygon":
                for ring in coords:
                    for coord in ring:
                        if coord[0] < minx: minx = coord[0]
                        if coord[0] > maxx: maxx = coord[0]
                        if coord[1] < miny: miny = coord[1]
                        if coord[1] > maxy: maxy = coord[1]
            
            return (minx, miny, maxx, maxy)
        
        except Exception, E:
            raise Exception("Unable to determine bounding box for feature: %s. \nGeometry:\n %s" % (E, self.geometry))

    def to_dict (self):
        return {"id": self.id,
                "geometry": self.geometry,
                "geometry_attr" : self.geometry_attr,
                "srs" : self.srs,
                "properties": self.properties}
