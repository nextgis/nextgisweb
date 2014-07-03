__author__  = "MetaCarta"
__copyright__ = "Copyright (c) 2006-2008 MetaCarta"
__license__ = "Clear BSD" 
__version__ = "$Id: VersionedPostGIS.py 496 2008-05-18 13:01:13Z crschmidt $"

from FeatureServer.DataSource import DataSource
from vectorformats.Feature import Feature
from FeatureServer.DataSource.PostGIS import PostGIS
from vectorformats.Formats import WKT

try:
    import cPickle
except ImportError:
    import Pickle as cPickle

import uuid

class VersionedPostGIS (PostGIS):
    """A proof of concept for versioned PostGIS-powered geo-database support.
       Allows 'open tagging', and creates transaction logs for looking through
       historical changes to the datastore."""
    def __init__(self, name, srid = 4326, srid_out = 4326, fid = "id", geometry = "shape", order = "", **args):
        DataSource.__init__(self, name, **args)
        self.db         = None
        self.table      = "feature" 
        self.fid_col    = fid
        self.geom_col   = geometry
        self.order      = order
        self.srid       = srid
        self.srid_out   = srid_out
        self.dsn        = args["dsn"]
    
    def begin (self):
        PostGIS.begin(self)
        self.txn_uuid = uuid.uuid1().hex
        sql = """INSERT INTO txn (uuid, actor, message, commit_time)
                        VALUES ('%s', 1, 'message', now());""" % self.txn_uuid
        cursor = self.db.cursor()
        cursor.execute(str(sql))
        
    def commit (self):
        sql = """update txn set bbox = envelope(collect(shape)) from history
                    where history.txn_id = txn.uuid and txn.uuid = '%s'""" \
                    % self.txn_uuid
        cursor = self.db.cursor()
        cursor.execute(str(sql))
        PostGIS.commit(self)

    def insert (self, action):
        feature = action.feature
        values = {'geom' : WKT.to_wkt(feature.geometry),
                  'uuid' : uuid.uuid1().hex,
                  'attrs': self._serializeattrs(feature.properties)}
        sql = """INSERT INTO %s (%s, uuid, attrs)
                    VALUES (SetSRID(%%(geom)s::geometry, %s),
                                %%(uuid)s, %%(attrs)s)""" % (
                                    self.table, self.geom_col, self.srid)
        cursor = self.db.cursor()
        cursor.execute(str(sql), values)
        return {}

    def update (self, action):
        feature = action.feature
        sql = """UPDATE %s SET %s = SetSRID(%%(geom)s::geometry, %s),
                               attrs = %%(attrs)s WHERE %s = %(id)d""" % (
                self.table, self.geom_col, self.srid, self.fid_col )
        values = {'geom' : WKT.to_wkt(feature.geometry),
                  'id'   : action.id,
                  'attrs': self._serializeattrs(feature.properties)}
        cursor = self.db.cursor()
        cursor.execute(str(sql), values)
        return self.select(action)

    def select (self, action):
        cursor = self.db.cursor()

        if action.id is not None:
            sql = "SELECT AsText(%s) as fs_binary_geom_col, * FROM %s WHERE %s = %%(%s)d" % (
                    self.geom_col, self.table, self.fid_col, self.fid_col )
            cursor.execute(str(sql), {self.fid_col: action.id})
            result = [cursor.fetchone()]
        else:
            filters = []
            attrs   = {}
            if action.bbox:
                filters.append( "%s && SetSRID('BOX3D(%f %f,%f %f)'::box3d, %s) and intersects(%s, SetSRID('BOX3D(%f %f,%f %f)'::box3d, %s))" % (
                                        (self.geom_col,) + tuple(action.bbox) + (self.srid,) + (self.geom_col,) + (tuple(action.bbox) + (self.srid,))))
            
            if action.attributes:
                match = Feature(props = action.attributes)
                filters = self.feature_predicates(match)
                attrs = action.attributes

            sql = "SELECT AsText(%s) as fs_binary_geom_col, uuid, id, attrs FROM %s" % (self.geom_col, self.table)
            #if filters:
            #    sql += " WHERE " + " AND ".join(filters)
            
            if self.order:
                sql += self.order
            if action.maxfeatures:
                sql += " LIMIT %d" % action.maxfeatures
            else:   
                sql += " LIMIT 1000"
            if action.startfeature:
                sql += " OFFSET %d" % action.startfeature
            
            cursor.execute(str(sql), attrs)
            result = cursor.fetchall() # should use fetchmany(action.maxfeatures)

        columns = [desc[0] for desc in cursor.description]
        features = []
        for row in result:
            props = dict(zip(columns, row))
            geom  = WKT.from_wkt(props['fs_binary_geom_col'])
            if props.has_key(self.geom_col): del props[self.geom_col]
            del props['fs_binary_geom_col']
            props.update(self._deserializeattrs(props['attrs']))
            del props['attrs']
            fid = props[self.fid_col]
            del props[self.fid_col]
            for key, value in props.items():
                if isinstance(value, str): 
                    props[key] = unicode(value, "utf-8")
            features.append( Feature( fid, geom, self.geom_col, self.srid_out, props ) ) 
        return features
    
    def _serializeattrs(self, properties):
        import sys
        print >>sys.stderr, properties
        return cPickle.dumps(properties)

    def _deserializeattrs(self, attrstr):
        return cPickle.loads(attrstr)
