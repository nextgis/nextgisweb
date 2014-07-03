'''
Created on Oct 22, 2012
    
@author: michel
'''

import os

from FeatureServer.DataSource import DataSource
from vectorformats.Feature import Feature
from vectorformats.Formats import WKT

from FeatureServer.WebFeatureService.Response.InsertResult import InsertResult
from FeatureServer.WebFeatureService.Response.UpdateResult import UpdateResult
from FeatureServer.WebFeatureService.Response.DeleteResult import DeleteResult
from FeatureServer.WebFeatureService.Response.ReplaceResult import ReplaceResult


from pyspatialite import dbapi2 as db

import datetime

from FeatureServer.Exceptions.ConnectionException import ConnectionException


class SpatialLite (DataSource):
    
    query_action_types = ['lt', 'gt', 'ilike', 'like', 'gte', 'lte']
    
    query_action_sql = {'lt': '<', 'gt': '>',
        'ilike': 'ilike', 'like':'like',
        'gte': '>=', 'lte': '<='}

    def __init__(self, name, file, fid = "gid", geometry = "geometry", fe_attributes = 'true', order = "", srid = 4326, srid_out = 4326, encoding = "utf-8", writable = True, attribute_cols = "*", **kwargs):
        DataSource.__init__(self, name, **kwargs)
        self.file           = file
        self.table          = kwargs["layer"]
        self.fid_col        = fid
        self.geom_col       = geometry
        self.srid           = srid
        self.srid_out       = srid_out
        self.writable       = writable
        self.attribute_cols = attribute_cols
        self.order          = order
        self.encoding       = encoding

        self.fe_attributes = True
        if fe_attributes.lower() == 'false':
            self.fe_attributes  = False
    

    def column_names (self, feature):
        return feature.properties.keys()
    
    def value_formats (self, feature):
        values = ["%%(%s)s" % self.geom_col]
        values = []
        for key, val in feature.properties.items():
            valtype = type(val).__name__
            if valtype == "dict":
                val['pred'] = "%%(%s)s" % (key,)
                values.append(val)
            else:
                fmt     = "%%(%s)s" % (key, )
                values.append(fmt)
        return values
    
    
    def feature_predicates (self, feature):
        columns = self.column_names(feature)
        values  = self.value_formats(feature)
        predicates = []
        for pair in zip(columns, values):
            if pair[0] != self.geom_col:
                if isinstance(pair[1], dict):
                    # Special Query: pair[0] is 'a', pair[1] is {'type', 'pred', 'value'}
                    # We build a Predicate here, then we replace pair[1] with pair[1] value below
                    if pair[1].has_key('value'):
                        predicates.append("%s %s %s" % (pair[1]['column'],
                                                        self.query_action_sql[pair[1]['type']],
                                                        pair[1]['pred']))
                
                else:
                    predicates.append("%s = %s" % pair)
        if feature.geometry and feature.geometry.has_key("coordinates"):
            predicates.append(" %s = SetSRID('%s'::geometry, %s) " % (self.geom_col, WKT.to_wkt(feature.geometry), self.srid))
        return predicates

    
    def begin(self):
        if not os.path.exists(self.file):
            raise ConnectionException(**{'layer':self.name,'locator':'SpatialLite'})
        self._connection = db.connect(self.file, check_same_thread = False)
    
    def close(self):
        self._connection.close()

    def commit(self):
        if self.writable:
            self._connection.commit()
        self.close()

    def rollback(self):
        if self.writable:
            self._connection.rollback()
        self.close()

    def insert(self, action):
        self.begin()
        if action.feature != None:
            feature = action.feature

            columns = ", ".join(self.column_names(feature)+[self.geom_col])
            values = ", ".join(self.value_formats(feature)+["SetSRID('%s'::geometry, %s) " % (WKT.to_wkt(feature.geometry), self.srid)])

            sql = "INSERT INTO \"%s\" (%s) VALUES (%s)" % (self.table, columns, values)

            cursor = self._connection.cursor()
            cursor.execute(str(sql), self.feature_values(feature))
    
            cursor.execute("SELECT last_insert_rowid()")
            action.id = cursor.fetchone()[0]
    
            return InsertResult(action.id, "")
            
        
        elif action.wfsrequest != None:
            sql = action.wfsrequest.getStatement(self)
            
            cursor = self._connection.cursor()
            cursor.execute(str(sql))
            
            cursor.execute("SELECT last_insert_rowid()")
            action.id =  cursor.fetchone()[0]
            
            return InsertResult(action.id, "")
            
        return None

    def update(self, action):
        self.begin()
        if action.feature != None:
            feature = action.feature
            predicates = ", ".join( self.feature_predicates(feature) )
            sql = "UPDATE \"%s\" SET %s WHERE %s = %d" % (self.table, predicates, self.fid_col, action.id )
            cursor = self._connection.cursor()
            cursor.execute(str(sql), self.feature_values(feature))

            return UpdateResult(action.id, "")
        
        elif action.wfsrequest != None:
            sql = action.wfsrequest.getStatement(self)
            cursor = self._connection.cursor()
            cursor.execute(str(sql))
            
            return UpdateResult(action.id, "")
            
        return None


    def delete(self, action):
        self.begin()
        if action.feature != None:
            sql = "DELETE FROM \"%s\" WHERE %s = %%(%s)d" % (self.table, self.fid_col, self.fid_col )
            cursor = self._connection.cursor()
            try:
                cursor.execute(str(sql) % {self.fid_col: action.id})
            except:
                cursor.execute(str(sql), {self.fid_col: action.id})
                    
            return DeleteResult(action.id, "")
    
        elif action.wfsrequest != None:
            sql = action.wfsrequest.getStatement(self)
            cursor = self._connection.cursor()
            try:
                cursor.execute(str(sql) % {self.fid_col: action.id})
            except:
                cursor.execute(str(sql), {self.fid_col: action.id})
            
            return DeleteResult(action.id, "")
        
        return None
        

    def select(self, action):
        self.begin()
        cursor = self._connection.cursor()
        
        if action.id is not None:
            sql = "SELECT AsText(Transform(%s, %d)) as fs_text_geom, " % (self.geom_col, int(self.srid_out))

            if hasattr(self, 'version'):
                sql += "%s as version, " % self.version
            if hasattr(self, 'ele'):
                sql += "%s as ele, " % self.ele
            
            sql += "\"%s\"" % self.fid_col
        
            if len(self.attribute_cols) > 0:
                sql += ", %s" % self.attribute_cols

            if hasattr(self, "additional_cols"):
                cols = self.additional_cols.split(';')
                additional_col = ",".join(cols)
                sql += ", %s" % additional_col
            
            sql += " FROM \"%s\" WHERE %s = :%s" % (self.table, self.fid_col, self.fid_col)
            cursor.execute(str(sql), {self.fid_col: str(action.id)})
            
            result = [cursor.fetchone()]
            
        else:
            filters = []
            attrs = []
            if action.attributes:
                match = Feature(props = action.attributes)
                filters = self.feature_predicates(match)
                for key, value in action.attributes.items():
                    if isinstance(value, dict):
                        attrs[key] = value['value']
                    else:
                        attrs[key] = value
            if action.bbox:
                filters.append("Intersects(Transform(BuildMBR(%f, %f, %f, %f, %s), %s), geometry)" % (tuple(action.bbox) + (self.srid_out,) + (self.srid,)))


            sql = "SELECT AsText(Transform(%s, %d)) as fs_text_geom, " % (self.geom_col, int(self.srid_out))
            if hasattr(self, 'ele'):
                sql += "%s as ele, " % self.ele
            if hasattr(self, 'version'):
                sql += "%s as version, " % self.version
            sql += "\"%s\"" % self.fid_col
                
            if len(self.attribute_cols) > 0:
                sql += ", %s" % self.attribute_cols
                        
            # check OGC FE attributes
            if self.fe_attributes and action.wfsrequest:
                fe_cols = action.wfsrequest.getAttributes()
                ad_cols = self.getColumns()    
                
                fe_cols = filter(lambda x: x not in ad_cols, fe_cols)
                
                if len(fe_cols) > 0:
                    sql += ", %s" % ",".join(fe_cols)
                
            if hasattr(self, "additional_cols"):
                cols = self.additional_cols.split(';')
                additional_col = ",".join(cols)
                sql += ", %s" % additional_col

            
            sql += " FROM \"%s\"" % (self.table)
            
            if filters:
                sql += " WHERE " + " AND ".join(filters)
            if action.wfsrequest:
                if filters:
                    sql += " AND "
                else:
                    sql += " WHERE "
                sql += action.wfsrequest.render(self)
            
            if self.order:
                sql += " ORDER BY " + self.order
            if action.maxfeatures:
                sql += " LIMIT %d" % action.maxfeatures
            #else:
            #    sql += " LIMIT 1000"
            if action.startfeature:
                sql += " OFFSET %d" % action.startfeature
            
            cursor.execute(str(sql), attrs)

            result = cursor.fetchall()
                
        columns = [desc[0] for desc in cursor.description]
        features = []
        
        for row in result:
            props = dict(zip(columns, row))
            if not props['fs_text_geom']: continue
            geom  = WKT.from_wkt(props['fs_text_geom'])
            id = props[self.fid_col]
            del props[self.fid_col]
            if self.attribute_cols == '*':
                del props[self.geom_col]
            del props['fs_text_geom']
            for key, value in props.items():
                if isinstance(value, str):
                    props[key] = unicode(value, self.encoding)
                elif isinstance(value, datetime.datetime) or isinstance(value, datetime.date):
                    # stringify datetimes
                    props[key] = str(value)

                try:
                    if isinstance(value, decimal.Decimal):
                        props[key] = unicode(str(value), self.encoding)
                except:
                    pass

            if (geom):
                features.append( Feature( id, geom, self.geom_col, self.srid_out, props ) )
        return features

    def getColumns(self):
        cols = []

        if hasattr(self, 'attribute_cols'):
            cols = self.attribute_cols.split(",")
        
        cols.append(self.geom_col)
        cols.append(self.fid_col)
        
        if hasattr(self, 'version'):
            cols.append(self.version)
        if hasattr(self, 'ele'):
            cols.append(self.ele)
        
        return cols
        
    
    def getAttributeDescription(self, attribute):
        self.begin()
        cursor = self._connection.cursor()
        result = []
        
        sql = "PRAGMA table_info(%s)"
        
        try:
            cursor.execute(sql % self.table)
            result = cursor.fetchall()
            self.commit()
        except:
            pass
        
    
        type = 'string'
        length = ''
        
        if len(result) > 0:
            for col in result:
                if col[1] == attribute:
                    if str(col[2]).lower().startswith('int'):
                        type = 'integer'
                        length = ''
                        break
    
        return (type, length)
