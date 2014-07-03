__author__  = "MetaCarta"
__copyright__ = "Copyright (c) 2006-2008 MetaCarta"
__license__ = "Clear BSD" 
__version__ = "$Id: OGR.py 617 2009-10-06 18:10:49Z jlivni $"

from FeatureServer.DataSource import DataSource
from FeatureServer.DataSource import Lock
from vectorformats.Feature import Feature

try:
    from osgeo import ogr
    from osgeo import osr
except:
    import ogr
    import osr

class OGR (DataSource):
    """Uses the ogr Python bindings to query/update/delete an OGR 
       datasource. Feature support is limited in the same way as 
       OGR's underlying datasource.""" 
    freeze_type = {
        ogr.wkbPoint            : "Point",
        ogr.wkbLineString       : "LineString",
        ogr.wkbPolygon          : "Polygon",
        ogr.wkbMultiPoint       : "Point",
        ogr.wkbMultiLineString  : "LineString",
        ogr.wkbMultiPolygon     : "Polygon"
    }
    # thaw_type = dict(map(lambda (x,y): (y,x), freeze_type.items()))
    thaw_type = {
        "Point"     : ogr.wkbPoint,
        "LineString": ogr.wkbLineString,
        "Polygon"   : ogr.wkbPolygon
    }
    error_msgs = [
        "OK",
        "Not enough data",
        "Not enough memory",
        "Unsupported geometry type",
        "Unsupported operation",
        "Corrupt data",
        "Unknown failure",
        "Unsupported SRS"
    ]

    def __init__(self, name, writable = 0, lockfile = 0, 
                 dsn = None, layer = None, attribute_cols = '', **args):
        DataSource.__init__(self, name, **args)
        if int(writable) and lockfile: 
            self.lock = Lock(lockfile)
        else:
            self.lock = None
        self.ds     = ogr.Open( dsn, int(writable) )
        if layer:
            self.layer  = self.ds.GetLayerByName(layer)
        else:
            self.layer  = self.ds.GetLayer(0)
        self.defn   = self.layer.GetLayerDefn()
        self.fields = [self.defn.GetFieldDefn(i)
                        for i in range(self.defn.GetFieldCount())]
        if attribute_cols:
            self.attribute_cols = [x.lower() for x in attribute_cols.split(',')]
        else:
            self.attribute_cols = None
    
    def insert (self, action):
        feature = self.thaw_feature(action.feature)
        err = self.layer.CreateFeature(feature)
        if err:
            raise ogr.OGRError("Create error: %s" % self.error_msgs[err])
        action.id = feature.GetFID()
        feature.Destroy()
        if action.id > 0: # because the OGR PostGIS driver sux
            return self.select(action)
        else:
            action.feature.id = action.id
            return [action.feature]

    def update (self, action):
        feature = self.thaw_feature(action.feature)
        feature.SetFID(action.id)
        err = self.layer.SetFeature(feature)
        if err:
            raise ogr.OGRError("Update error on FID %d: %s"
                                % (action.id, self.error_msgs[err]))
        feature.Destroy()
        return self.select(action)
        
    def delete (self, action):
        err = self.layer.DeleteFeature(action.id)
        if err:
            raise ogr.OGRError("Delete error on FID %d: %s"
                                % (action.id, self.error_msgs[err]))
        return []

    def select (self, action):
        result = []
        if action.id is not None:
            feature = self.layer.GetFeature(action.id)
            if not feature:
                raise Exception("No such feature. (%s)" % action.id)
            result.append( feature )
        else:
            if action.bbox:
                self.layer.SetSpatialFilterRect(*action.bbox)
            else:
                self.layer.SetSpatialFilter(None)
            if action.attributes:
                query = []
                for keyval in action.attributes.items():
                    query.append("( %s = '%s' )" % keyval)
                query = " AND ".join(query)
            else:
                query = None
            self.layer.SetAttributeFilter(query)

            feature = True
            count = action.maxfeatures
            if not count:
                count = 1000
            counter = 0
            self.layer.ResetReading()
            while feature:
                feature = self.layer.GetNextFeature()
                if not feature: break
                if counter < action.startfeature:
                    counter += 1
                    continue
                result.append(feature)
                if count is not None:
                    count -= 1
                    if not count: break
                

        return self.freeze_features(result)

    def begin (self):
        if self.lock: return self.lock.lock()

    def commit (self):
        self.layer.SyncToDisk()
        if self.lock: self.lock.unlock()

    def thaw_feature (self, feature):
        def thaw_points (ogrgeom, coords):
            for coord in coords: ogrgeom.AddPoint(*coord)

        geom = feature.geometry
        if geom["type"] not in self.thaw_type:
            raise ogr.OGRError(
                "Geometry type %d not supported by FeatureServer"
                % geom["type"]);

        geomtype = self.thaw_type[geom["type"]]
        ogrgeom = ogr.Geometry( type = geomtype )

        coordinates = geom["coordinates"]
        if geomtype == ogr.wkbPoint:
            thaw_points( ogrgeom, [coordinates] )
        elif geomtype == ogr.wkbLineString:
            thaw_points( ogrgeom, coordinates )
        elif geomtype == ogr.wkbPolygon:
            for coords in coordinates:
                ring = ogr.Geometry( type = ogr.wkbLinearRing )
                thaw_points( ring, coords )
                ogrgeom.AddRingDirectly(ring)
            ogrgeom.closeRings()
        else:
            raise Exception("Unsupported geometry type")
        
        ogrfeature = ogr.Feature(self.defn)
        ogrfeature.SetGeometryDirectly(ogrgeom)
        for key, val in feature.properties.items():
            key = ogrfeature.GetFieldIndex(key)
            ogrfeature.SetField( key, val )

        return ogrfeature

    def _freeze_geometry (self, geom):
        def freeze_points (geom):
            coords = []
            for i in range(geom.GetPointCount()):
                coords.append([geom.GetX(i), geom.GetY(i)])
            return coords
            
        geomtype = geom.GetGeometryType() & ~ogr.wkb25Bit
        # throw away all but the first geometry in a multigeom
        # sorry!
        if geomtype in (ogr.wkbMultiPoint,
                        ogr.wkbMultiLineString,
                        ogr.wkbMultiPolygon):
            geom = geom.GetGeometryRef(0)

        if geomtype not in self.freeze_type:
            raise ogr.OGRError(
                "Geometry type %d not supported by FeatureServer"
                % geomtype);
                
        frozen_type = self.freeze_type[geomtype]
        if frozen_type == "Point":
            points = freeze_points(geom)
            if len(points) == 1:
                coords = points[0]
        elif frozen_type == "LineString":
            coords = freeze_points(geom)
        elif frozen_type == "Polygon":
            coords = []
            for i in range(geom.GetGeometryCount()):
                coords.append( freeze_points( geom.GetGeometryRef(i) ) )

        return {'type': frozen_type, 'coordinates': coords}

    freeze_geometry = classmethod(_freeze_geometry)

    def freeze_features (self, features):
        result = []
        for ogrfeat in features:
            feat = Feature(ogrfeat.GetFID())

            geom = ogrfeat.GetGeometryRef()
            feat.geometry = OGR.freeze_geometry(geom)

            for n, defn in enumerate(self.fields):
                key = defn.GetName()
                if self.attribute_cols and not key.lower() in self.attribute_cols:
                    continue
                value = ogrfeat.GetField(n)
                if isinstance(value, str): value = unicode(value, "utf-8")
                feat.properties[key] = value 

            result.append(feat)
            ogrfeat.Destroy() 

        return result
