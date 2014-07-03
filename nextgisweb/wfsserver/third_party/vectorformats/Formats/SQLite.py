'''
Created on Sep 14, 2012

@author: michel
'''

from vectorformats.Formats.Format import Format
from vectorformats.Formats import WKT
from pyspatialite import dbapi2 as db

class SQLite(Format):
    
    _connection = None
    _cursor = None
    
    def encode(self, features, **kwargs):
        tmpFile = kwargs["tmpFile"]
        
        if len(features) > 0:
            self._connection = db.connect(tmpFile)
            self._cursor = self._connection.cursor()
            
            self._cursor.execute('SELECT InitSpatialMetadata()')
            
            self.create_table(features[0])
                        
            for feature in features:
                self.encode_feature(feature)
            
            
            self._connection.commit()
            self._cursor.close()
        
        return self._connection
    
    def create_table(self, feature):
        sql = "CREATE TABLE featureserver (fid text, "
        
        for key, value in feature.properties.items():
            if key != "geometry":
                sql += "%s text, " % key
        
        sql = sql[:-2]
        sql += ")"
        
        self._cursor.execute(sql)
        
        if hasattr(self.datasource, 'srid_out') and self.datasource.srid_out is not None:
            srs = self.datasource.srid_out
        else:
            if hasattr(feature, "geometry_attr"):
                srs = str(feature.srs);
                if 'EPSG' in srs:
                    srs = srs[5:]
            else:
                srs = 4326
        
        self._cursor.execute('''SELECT AddGeometryColumn('featureserver', 'geometry', %i, '%s', 2);''' % (int(srs), feature['geometry']['type'].upper()))
        
    
    def encode_feature(self, feature):
        if hasattr(self.datasource, 'srid_out') and self.datasource.srid_out is not None:
            srs = self.datasource.srid_out
        else:
            if hasattr(feature, "geometry_attr"):
                srs = str(feature.srs);
                if 'EPSG' in srs:
                    srs = srs[5:]
            else:
                srs = 4326
        
        wkt = "GeomFromText('" + WKT.to_wkt(feature.geometry) + "', %i)" % int(srs)
        
        sql = "INSERT INTO featureserver (fid, "
        
        for key, value in feature.properties.items():
            if key != "geometry":
                sql += "%s, " % key
        sql += "geometry" 
        sql += ") VALUES ('%s', " % self.escapeSQL(str(feature.id).encode('utf-8'))
        
        for key, value in feature.properties.items():
            #key = self.getFormatedAttributName(key)
            if value == None:
                sql += "null, "
            else:
                sql += "'" + self.escapeSQL(value.encode('utf-8')) + "', "
        sql += wkt
        sql += ");"
        
        self._cursor.execute(sql)
        