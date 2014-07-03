__author__  = "MetaCarta"
__copyright__ = "Copyright (c) 2006-2008 MetaCarta"
__license__ = "Clear BSD" 
__version__ = "$Id: PostGIS.py 615 2009-09-23 00:47:48Z jlivni $"

from psycopg2 import errorcodes

from ...FeatureServer.DataSource import DataSource
from ...vectorformats.Feature import Feature
from ...vectorformats.Formats import WKT

from ...FeatureServer.WebFeatureService.Response.InsertResult import InsertResult
from ...FeatureServer.WebFeatureService.Response.UpdateResult import UpdateResult
from ...FeatureServer.WebFeatureService.Response.DeleteResult import DeleteResult
from ...FeatureServer.WebFeatureService.Response.ReplaceResult import ReplaceResult

from ...FeatureServer.Exceptions.WebFeatureService.InvalidValueException import InvalidValueException
from ...FeatureServer.Exceptions.ConnectionException import ConnectionException

try:
    import psycopg2 as psycopg
    
except:
    import psycopg

import copy
import re
import datetime

try:
    import decimal
except:
    pass
    
class PostGIS (DataSource):
    """PostGIS datasource. Setting up the table is beyond the scope of
       FeatureServer."""
    
    query_action_types = ['lt', 'gt', 'ilike', 'like', 'gte', 'lte']

    query_action_sql = {'lt': '<', 'gt': '>', 
                        'ilike': 'ilike', 'like':'like',
                        'gte': '>=', 'lte': '<=',
                        'eq': '='}
     
    def __init__(self, name, srid = 4326, srid_out = 4326, fid = "gid", geometry = "the_geom", fe_attributes = 'true', order = "", attribute_cols = '*', writable = True, encoding = "utf-8", hstore = 'false', hstore_attr = "", **args):
        DataSource.__init__(self, name, **args)
        self.table          = args["layer"]
        self.fid_col        = fid
        self.encoding       = encoding
        self.geom_col       = geometry
        self.order          = order
        self.srid           = srid
        self.srid_out       = srid_out
        self.db             = None
        self.dsn            = args["dsn"]
        self.writable       = writable
        self.attribute_cols = attribute_cols
        
        self.fe_attributes = True
        if fe_attributes.lower() == 'false':
            self.fe_attributes  = False

        if hstore.lower() == 'true':
            self.hstore = True
            self.hstoreAttribute = hstore_attr
        else:
            self.hstore = False
            self.hstoreAttribute = "";

    def begin (self):
        try:
            self.db = psycopg.connect(self.dsn)
        except Exception as e:
            raise ConnectionException(**{'dump':str(e),'layer':self.name,'locator':'PostGIS','code':e.pgcode})
    
    def commit (self):
        if self.writable:
            self.db.commit()
        self.db.close()

    def rollback (self):
        if self.writable:
            self.db.rollback()
        self.db.close()

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
            predicates.append(" %s = ST_SetSRID('%s'::geometry, %s) " % (self.geom_col, WKT.to_wkt(feature.geometry), self.srid))
        return predicates

    def feature_values (self, feature):
        props = copy.deepcopy(feature.properties)
        for key, val in props.iteritems():
            if type(val) is unicode: ### b/c psycopg1 doesn't quote unicode
                props[key] = val.encode(self.encoding)
            if type(val)  is dict:
                props[key] = val['value']
        return props


    def id_sequence (self):
        return self.table + "_" + self.fid_col + "_seq"
    
    def insert (self, action):
        self.begin()
        if action.feature != None:
            feature = action.feature
            columns = ", ".join(self.column_names(feature)+[self.geom_col])
            values = ", ".join(self.value_formats(feature)+["ST_SetSRID('%s'::geometry, %s) " % (WKT.to_wkt(feature.geometry), self.srid)])

            sql = "INSERT INTO \"%s\" (%s) VALUES (%s)" % (self.table, columns, values)

            cursor = self.db.cursor()
            cursor.execute(str(sql), self.feature_values(feature))

            cursor.execute("SELECT currval('%s');" % self.id_sequence())
            action.id = cursor.fetchone()[0]
            
            return InsertResult(action.id, "")
        
        elif action.wfsrequest != None:
            sql = action.wfsrequest.getStatement(self)
            
            cursor = self.db.cursor()
            cursor.execute(str(sql))
            
            cursor.execute("SELECT currval('%s');" % self.id_sequence())
            action.id = cursor.fetchone()[0]
            
            return InsertResult(action.id, "")
                        
        return None
        

    def update (self, action):
        if action.feature != None:
            feature = action.feature
            predicates = ", ".join( self.feature_predicates(feature) )

            sql = "UPDATE \"%s\" SET %s WHERE %s = %d" % ( self.table, predicates, self.fid_col, action.id )

            cursor = self.db.cursor()
            cursor.execute(str(sql), self.feature_values(feature))
            
            return UpdateResult(action.id, "")
        
        elif action.wfsrequest != None:
            sql = action.wfsrequest.getStatement(self)
            
            cursor = self.db.cursor()
            cursor.execute(str(sql))

            return UpdateResult(action.id, "")
            
        return None
        
    def delete (self, action):
        if action.feature != None:
            sql = "DELETE FROM \"%s\" WHERE %s = %%(%s)d" % ( self.table, self.fid_col, self.fid_col )
            cursor = self.db.cursor()
            
            try:
                cursor.execute(str(sql) % {self.fid_col: action.id})
            except:    
                cursor.execute(str(sql), {self.fid_col: action.id})
            
            return DeleteResult(action.id, "")
        
        elif action.wfsrequest != None:
            sql = action.wfsrequest.getStatement(self)
            cursor = self.db.cursor()
            try:
                cursor.execute(str(sql) % {self.fid_col: action.id})
            except:    
                cursor.execute(str(sql), {self.fid_col: action.id})
            
            return DeleteResult(action.id, "")
            
        return None


    def select (self, action):
        cursor = self.db.cursor()

        if action.id is not None:
            sql = "SELECT ST_AsText(ST_Transform(%s, %d)) as fs_text_geom, " % (self.geom_col, int(self.srid_out))
            
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

            sql += " FROM \"%s\" WHERE %s = %%(%s)s" % (self.table, self.fid_col, self.fid_col)
            
            #sql = "SELECT ST_AsText(ST_Transform(%s, %d)) as fs_text_geom, %s as ele, %s as version, \"%s, %s FROM \"%s\" WHERE %s = %%(%s)s" % (
            #        self.geom_col, int(self.srid_out), self.ele, self.version, self.fid_col, self.attribute_cols, self.table, self.fid_col, self.fid_col )

            cursor.execute(str(sql), {self.fid_col: str(action.id)})

            result = [cursor.fetchone()]
        else:
            filters = []
            attrs   = {}
            if action.attributes:
                match = Feature(props = action.attributes)
                filters = self.feature_predicates(match)
                for key, value in action.attributes.items():
                    if isinstance(value, dict):
                        attrs[key] = value['value']
                    else:
                        attrs[key] = value
            if action.bbox:
                filters.append( "%s && ST_Transform(ST_SetSRID('BOX3D(%f %f,%f %f)'::box3d, %s), %s) AND ST_Intersects(%s, ST_Transform(ST_SetSRID('BOX3D(%f %f,%f %f)'::box3d, %s), %s))" % (
                                        (self.geom_col,) + tuple(action.bbox) + (self.srid_out,) + (self.srid,) + (self.geom_col,) + (tuple(action.bbox) + (self.srid_out,) + (self.srid,))))
            sql = "SELECT ST_AsText(ST_Transform(%s, %d)) as fs_text_geom, " % (self.geom_col, int(self.srid_out))
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
            
            #sql = "SELECT ST_AsText(Transform(%s, %d)) as fs_text_geom, %s as ele, %s as version, \"%s\", %s FROM \"%s\"" % (self.geom_col, int(self.srid_out), self.ele, self.version, self.fid_col, self.attribute_cols, self.table)
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
                        
            try:
                cursor.execute(str(sql), attrs)
            except Exception, e:
                if e.pgcode[:2] == errorcodes.CLASS_SYNTAX_ERROR_OR_ACCESS_RULE_VIOLATION:
                    raise InvalidValueException(**{'dump':e.pgerror,'layer':self.name,'locator':'PostGIS'})
                
            result = cursor.fetchall() # should use fetchmany(action.maxfeatures)
        
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
        cursor = self.db.cursor()
        result = []

        sql = "SELECT t.typname AS type, a.attlen AS length FROM pg_class c, pg_attribute a, pg_type t "
        sql += "WHERE c.relname = '%s' and a.attname = '%s' and a.attnum > 0 and a.attrelid = c.oid and a.atttypid = t.oid ORDER BY a.attnum"
        
        try:
            cursor.execute(str(sql)% (self.table, attribute))
            result = [cursor.fetchone()]
            self.db.commit()
        except:
            pass 
        
        type = 'string'
        length = ''
        
        if len(result) > 0:
            if result[0]:
                if str((result[0])[0]).lower().startswith('int'):
                    type = 'integer'
                    if int((result[0])[1]) == 4:
                        length = ''
        
        return (type, length)
