from vectorformats.Feature import Feature
from vectorformats.Formats.Format import Format
import simplejson
try:
    import osgeo.ogr as ogr
except ImportError:
    import ogr
import re, xml.dom.minidom as m

class OGR(Format):
    """OGR reading and writing."""

    ds = None
    driver = "Memory"
    dsname = "vectorformats_output"
    layername = "features"
    save_on_encode = False
    def encode(self, features, **kwargs):
        self.ds = ogr.GetDriverByName(self.driver).CreateDataSource(self.dsname)
        layer = self.ds.CreateLayer(self.layername)
        props = []
        for feature in features:
            for prop, value in feature.properties.items():
                if not prop: continue
                if prop not in props:
                    props.append(prop)
                    prop = str(prop)
                    defn = ogr.FieldDefn(prop)
                    defn.SetWidth(len(value))
                    layer.CreateField(defn)
        for feature in features:
            f = ogr.Feature(feature_def=layer.GetLayerDefn())
            for prop, value in feature.properties.items():
                prop = str(prop)
                if isinstance(value, unicode):
                    value = value.encode("utf-8", "replace")
                f.SetField(prop, value)
            g = self.CreateGeometryFromJson(simplejson.dumps(feature.geometry))
            f.SetGeometryDirectly(g)
            layer.CreateFeature(f)
        if self.save_on_encode:
            layer.SyncToDisk()    
        return layer
    
    def decode(self, layer):
        features = []
        layer.ResetReading()
        feature = layer.GetNextFeature()
        while feature:
            id = feature.GetFID() 
            geometry = self.ExportToJson(feature.GetGeometryRef())
            props = {}
            for i in range(feature.GetFieldCount()):
                props[feature.GetFieldDefnRef(i).GetName()] = feature.GetFieldAsString(i)
            features.append(Feature(id, geometry, props))
            feature = layer.GetNextFeature()
        return features    
    
    def CreateGeometryFromJson(self, input):
        try:
            input['type']
        except TypeError:
            try:
                import simplejson
            except ImportError:
                raise ImportError, "You must have 'simplejson' installed to be able to use this functionality"
            input = simplejson.loads(input)
    
        types = { 'Point': ogr.wkbPoint,
                  'LineString': ogr.wkbLineString,
                  'Polygon': ogr.wkbPolygon,
                  'MultiPoint': ogr.wkbMultiPoint,
                  'MultiLineString': ogr.wkbMultiLineString,
                  'MultiPolygon': ogr.wkbMultiPolygon,
                  'GeometryCollection': ogr.wkbGeometryCollection
        }
       
        type = input['type']
        gtype = types[type]
    
        geometry = ogr.Geometry(type=gtype)
        coordinates = input['coordinates']
       
        if type == 'Point':
            geometry.AddPoint_2D(coordinates[0], coordinates[1])
        
        elif type == 'MultiPoint':
            for point in coordinates:
                gring = ogr.Geometry(type=ogr.wkbPoint)
                gring.AddPoint_2D(point[0], point[1])
                geometry.AddGeometry(gring)
       
        elif type == 'LineString':
            for coordinate in coordinates:
                geometry.AddPoint_2D(coordinate[0], coordinate[1])
        
        elif type == 'MultiLineString':
            for ring in coordinates:
                gring = ogr.Geometry(type=ogr.wkbLineString)
                for coordinate in ring:
                    gring.AddPoint_2D(coordinate[0], coordinate[1])
                geometry.AddGeometry(gring)
    
        
        elif type == 'Polygon':
            for ring in coordinates:
                gring = ogr.Geometry(type=ogr.wkbLinearRing)
                for coordinate in ring:
                    gring.AddPoint_2D(coordinate[0], coordinate[1])
                geometry.AddGeometry(gring)
        
        elif type == 'MultiPolygon':
            for poly in coordinates:
                gpoly = ogr.Geometry(type=ogr.wkbPolygon)
                for ring in poly:
                    gring = ogr.Geometry(type=ogr.wkbLinearRing)
                    for coordinate in ring:
                        gring.AddPoint_2D(coordinate[0], coordinate[1])
                    gpoly.AddGeometry(gring)
                geometry.AddGeometry(gpoly)
        
        return geometry
    
    def ExportToJson(self, geometry):
        def get_coordinates(geometry):
            gtype = geometry.GetGeometryType()
            geom_count = geometry.GetGeometryCount()
            coordinates = []
    
            if gtype == ogr.wkbPoint or gtype == ogr.wkbPoint25D:
                return [geometry.GetX(0), geometry.GetY(0)]
                
            if gtype == ogr.wkbMultiPoint or gtype == ogr.wkbMultiPoint25D:
                geom_count = geometry.GetGeometryCount()
                for g in range(geom_count):
                    geom = geometry.GetGeometryRef(g)
                    coordinates.append(get_coordinates(geom))
                return coordinates
    
            if gtype == ogr.wkbLineString or gtype == ogr.wkbLineString25D:
                points = []
                point_count = geometry.GetPointCount()
                for i in range(point_count):
                    points.append([geometry.GetX(i), geometry.GetY(i)])
                return points
    
            if gtype == ogr.wkbMultiLineString or gtype == ogr.wkbMultiLineString25D:
                coordinates = []
                geom_count = geometry.GetGeometryCount()
                for g in range(geom_count):
                    geom = geometry.GetGeometryRef(g)        
                    coordinates.append(get_coordinates(geom))
                return coordinates
    
            if gtype == ogr.wkbPolygon or gtype == ogr.wkbPolygon25D:
                geom = geometry.GetGeometryRef(0)
                coordinates = get_coordinates(geom)
                return [coordinates]
    
            if gtype == ogr.wkbMultiPolygon or gtype == ogr.wkbMultiPolygon25D:
    
                coordinates = []
                geom_count = geometry.GetGeometryCount()
                for g in range(geom_count):
                    geom = geometry.GetGeometryRef(g)
                    coordinates.append(get_coordinates(geom))
                return coordinates
                
        types = { ogr.wkbPoint:'Point',
                  ogr.wkbLineString: 'LineString',
                  ogr.wkbPolygon: 'Polygon',
                  ogr.wkbMultiPoint: 'MultiPoint',
                  ogr.wkbMultiLineString: 'MultiLineString',
                  ogr.wkbMultiPolygon: 'MultiPolygon',
                  ogr.wkbGeometryCollection: 'GeometryCollection'  
        }
    
        output = {'type': types[geometry.GetGeometryType()],
                  'coordinates': get_coordinates(geometry)}
        return output
